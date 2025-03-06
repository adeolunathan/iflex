// services/user-management/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserFromToken } from '../utils/auth';

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
    const tokenData = await verifyToken(token);
    
    if (tokenData) {
      req.user = {
        id: tokenData.userId,
        roles: tokenData.roles,
        organizationId: tokenData.organizationId,
      };
      req.sessionId = tokenData.sessionId;
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
}