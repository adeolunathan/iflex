// services/analytics-service/src/db/index.ts

import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config';
import { createClient as createClickhouseClient } from '@clickhouse/client';

// PostgreSQL connection
export const pgPool = new Pool({
  connectionString: config.databaseUrl,
});

// Redis connection
export const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// ClickHouse connection
export const clickhouseClient = createClickhouseClient({
  url: config.clickhouseUrl,
  format: 'JSONEachRow',
});

export const connectDb = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    
    const pgClient = await pgPool.connect();
    pgClient.release();
    console.log('Connected to PostgreSQL');
    
    // Test ClickHouse connection
    const pingResult = await clickhouseClient.ping();
    console.log('ClickHouse ping result:', pingResult);
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};