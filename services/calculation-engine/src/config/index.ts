// services/calculation-engine/src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4002,
  environment: process.env.NODE_ENV || 'development',
};