// services/integration-service/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4005,
  environment: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/financeforge',
  modelServiceUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:4001/graphql',
  calculationEngineUrl: process.env.CALCULATION_ENGINE_URL || 'http://localhost:4002/graphql',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  fileUploadPath: process.env.FILE_UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  s3Bucket: process.env.S3_BUCKET || 'financeforge-uploads',
  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretKey: process.env.AWS_SECRET_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  integrationTimeout: parseInt(process.env.INTEGRATION_TIMEOUT || '300000', 10), // 5 minutes default
};