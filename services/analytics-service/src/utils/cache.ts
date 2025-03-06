// services/analytics-service/src/utils/cache.ts

import { redisClient } from '../db';
import { config } from '../config';
import { QueryCache } from '../types';

export async function getCachedQuery(
  query: string,
  params: Record<string, any>
): Promise<any | null> {
  try {
    // Create a cache key based on query and params
    const cacheKey = createCacheKey(query, params);
    
    // Check if query is cached
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached query:', error);
    return null;
  }
}

export async function setCachedQuery(
  query: string,
  params: Record<string, any>,
  result: any,
  ttl: number = config.queryCacheTTL
): Promise<void> {
  try {
    // Create a cache key based on query and params
    const cacheKey = createCacheKey(query, params);
    
    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(result), {
      EX: ttl, // Expiration in seconds
    });
  } catch (error) {
    console.error('Error setting cached query:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Find all keys matching the pattern
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      // Delete all matching keys
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

function createCacheKey(query: string, params: Record<string, any>): string {
  // Create a deterministic string representation of the params
  const paramString = JSON.stringify(params, Object.keys(params).sort());
  
  // Hash query and params to create a cache key
  return `query:${Buffer.from(query).toString('base64')}:${Buffer.from(paramString).toString('base64')}`;
}