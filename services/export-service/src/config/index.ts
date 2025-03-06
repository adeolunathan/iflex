// services/export-service/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4007,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/financeforge',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  environment: process.env.NODE_ENV || 'development',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  modelServiceUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:4001/graphql',
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4006/graphql',
  s3Bucket: process.env.S3_BUCKET || 'financeforge-exports',
  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretKey: process.env.AWS_SECRET_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
  publicUrlBase: process.env.PUBLIC_URL_BASE || 'http://localhost:4007/exports',
  exportJobTTL: parseInt(process.env.EXPORT_JOB_TTL || '86400', 10), // 24 hours in seconds
};
