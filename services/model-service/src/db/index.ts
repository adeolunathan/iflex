// services/model-service/src/db/index.ts

import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config';

// PostgreSQL connection
export const pgPool = new Pool({
  connectionString: config.databaseUrl,
});

// Redis connection
export const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectDb = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    
    const pgClient = await pgPool.connect();
    pgClient.release();
    console.log('Connected to PostgreSQL');
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};