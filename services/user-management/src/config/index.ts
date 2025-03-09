// services/user-management/src/config/index.ts

import dotenv from "dotenv";
import path from "path";

// Load from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Log the environment for debugging
console.log("Environment: ", process.env.NODE_ENV);
console.log("JWT Secret exists: ", !!process.env.JWT_SECRET);

// Fixed JWT secret for testing if environment variable is missing
const DEFAULT_JWT_SECRET = "your-secret-key";

export const config = {
  port: process.env.PORT || 4003,
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/financeforge",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  environment: process.env.NODE_ENV || "development",
  bcryptSaltRounds: 10,
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
