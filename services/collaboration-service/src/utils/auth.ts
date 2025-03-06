// services/collaboration-service/src/utils/auth.ts

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { config } from '../config';
import { User } from '../types';

export interface TokenData {
  userId: string;
  roles: string[];
  organizationId: string;
  sessionId: string;
}

export async function verifyToken(token: string): Promise<TokenData | null> {
  try {
    // Verify token format and signature (basic check)
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      roles: string[];
      organizationId: string;
      sessionId: string;
    };
    
    // In a real implementation, we might want to check with the user service
    // to ensure the token is still valid (not revoked, etc.)
    
    return {
      userId: decoded.sub,
      roles: decoded.roles,
      organizationId: decoded.organizationId,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function getUserInfo(userId: string, token: string): Promise<User | null> {
  try {
    // Call the user service to get user information
    const response = await fetch(config.userServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetUser($id: ID!) {
            user(id: $id) {
              id
              firstName
              lastName
              email
            }
          }
        `,
        variables: {
          id: userId,
        },
      }),
    });
    
    const responseData = await response.json();
    
    if (responseData.errors) {
      console.error('Error fetching user:', responseData.errors);
      return null;
    }
    
    const userData = responseData.data.user;
    
    return {
      id: userData.id,
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}