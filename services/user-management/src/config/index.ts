// services/user-management/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4003,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/financeforge',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  environment: process.env.NODE_ENV || 'development',
  bcryptSaltRounds: 10,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};