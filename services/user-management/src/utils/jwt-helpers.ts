// services/user-management/src/utils/jwt-helpers.ts

import jwt from "jsonwebtoken";
import { Secret, SignOptions } from "jsonwebtoken";

// Helper function with proper type handling
export function signJwt(
  payload: string | object | Buffer,
  secret: string,
  options?: SignOptions
): string {
  // Convert the secret to the correct type
  const secretOrKey = secret as Secret;
  return jwt.sign(payload, secretOrKey, options);
}

// Helper function for verification
export function verifyJwt<T>(token: string, secret: string): T | null {
  try {
    // Convert the secret to the correct type
    const secretOrKey = secret as Secret;
    return jwt.verify(token, secretOrKey) as T;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
