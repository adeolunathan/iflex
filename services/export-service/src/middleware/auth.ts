// services/export-service/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    organizationId: string;
  };
  sessionId?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        sub: string;
        roles: string[];
        organizationId: string;
        sessionId: string;
      };
      
      req.user = {
        id: decoded.sub,
        roles: decoded.roles,
        organizationId: decoded.organizationId,
      };
      req.sessionId = decoded.sessionId;
    } catch (error) {
      console.error('Token verification error:', error);
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
}