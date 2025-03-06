// services/collaboration-service/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4004,
  wsPort: process.env.WS_PORT || 4104,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  environment: process.env.NODE_ENV || 'development',
  modelServiceUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:4001/graphql',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4003/graphql',
  operationHistoryLimit: 100,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};