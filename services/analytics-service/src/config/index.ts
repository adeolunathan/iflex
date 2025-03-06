// services/analytics-service/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4006,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/financeforge',
  clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  environment: process.env.NODE_ENV || 'development',
  modelServiceUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:4001/graphql',
  calculationEngineUrl: process.env.CALCULATION_ENGINE_URL || 'http://localhost:4002/graphql',
  queryCacheTTL: parseInt(process.env.QUERY_CACHE_TTL || '300', 10), // 5 minutes in seconds
  smtpHost: process.env.SMTP_HOST || 'smtp.example.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || 'user',
  smtpPass: process.env.SMTP_PASS || 'password',
  smtpFrom: process.env.SMTP_FROM || 'reports@financeforge.com',
};