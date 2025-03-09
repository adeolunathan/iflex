// services/user-management/src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import { verifyToken, getUserFromToken } from "../utils/auth";

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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No authorization header or not Bearer token");
      return next();
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "Authenticating with token (first 10 chars):",
      token.substring(0, 10) + "..."
    );

    const tokenData = await verifyToken(token);

    if (tokenData) {
      console.log("Token verified for user:", tokenData.userId);
      req.user = {
        id: tokenData.userId,
        roles: tokenData.roles,
        organizationId: tokenData.organizationId,
      };
      req.sessionId = tokenData.sessionId;
    } else {
      console.log("Token verification failed - no data returned");
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next();
  }
}
