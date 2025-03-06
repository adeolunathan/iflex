// services/user-management/src/utils/auth.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User, UserSession } from '../types';
import { pgPool, redisClient } from '../db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(user: User): Promise<UserSession> {
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
  
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    organizationId: user.organizationId,
    sessionId,
  };
  
  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  
  // Store session in database
  await pgPool.query(
    `INSERT INTO user_sessions (
      id, user_id, token, expires_at, created_at, last_active_at
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      sessionId,
      user.id,
      token,
      expiresAt,
      new Date(),
      new Date(),
    ]
  );
  
  // Also cache in Redis for faster access
  await redisClient.set(`session:${sessionId}`, JSON.stringify({
    userId: user.id,
    token,
    expiresAt,
  }), {
    EX: Math.floor((expiresAt.getTime() - Date.now()) / 1000), // TTL in seconds
  });
  
  return {
    id: sessionId,
    userId: user.id,
    token,
    expiresAt,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };
}

export async function verifyToken(token: string): Promise<{
  userId: string;
  sessionId: string;
  roles: string[];
  organizationId: string;
} | null> {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
      roles: string[];
      organizationId: string;
      sessionId: string;
    };
    
    // Check if session still exists and is valid
    const cachedSession = await redisClient.get(`session:${decoded.sessionId}`);
    if (cachedSession) {
      const session = JSON.parse(cachedSession);
      if (new Date(session.expiresAt) > new Date()) {
        // Update last active time
        await pgPool.query(
          'UPDATE user_sessions SET last_active_at = $1 WHERE id = $2',
          [new Date(), decoded.sessionId]
        );
        
        return {
          userId: decoded.sub,
          sessionId: decoded.sessionId,
          roles: decoded.roles,
          organizationId: decoded.organizationId,
        };
      }
    }
    
    // If not in cache, check database
    const { rows } = await pgPool.query(
      'SELECT * FROM user_sessions WHERE id = $1 AND expires_at > $2',
      [decoded.sessionId, new Date()]
    );
    
    if (rows.length > 0) {
      // Update last active time
      await pgPool.query(
        'UPDATE user_sessions SET last_active_at = $1 WHERE id = $2',
        [new Date(), decoded.sessionId]
      );
      
      // Update cache
      await redisClient.set(`session:${decoded.sessionId}`, JSON.stringify({
        userId: decoded.sub,
        token,
        expiresAt: rows[0].expires_at,
      }), {
        EX: Math.floor((new Date(rows[0].expires_at).getTime() - Date.now()) / 1000),
      });
      
      return {
        userId: decoded.sub,
        sessionId: decoded.sessionId,
        roles: decoded.roles,
        organizationId: decoded.organizationId,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function invalidateSession(sessionId: string): Promise<boolean> {
  try {
    // Remove from database
    await pgPool.query(
      'DELETE FROM user_sessions WHERE id = $1',
      [sessionId]
    );
    
    // Remove from cache
    await redisClient.del(`session:${sessionId}`);
    
    return true;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
}

export async function invalidateAllUserSessions(userId: string): Promise<boolean> {
  try {
    // Get all sessions for user
    const { rows } = await pgPool.query(
      'SELECT id FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    
    // Remove from database
    await pgPool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    
    // Remove from cache
    for (const row of rows) {
      await redisClient.del(`session:${row.id}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    return false;
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const tokenData = await verifyToken(token);
  if (!tokenData) {
    return null;
  }
  
  try {
    const { rows } = await pgPool.query(
      'SELECT * FROM users WHERE id = $1',
      [tokenData.userId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}