import { createClient, RedisClientType } from 'redis';
import { config } from './config';
import { logger } from './logger';

let redisClient: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

// Cache helpers
export const cache = {
  // Set value with optional expiry (in seconds)
  async set(key: string, value: any, expiry?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (expiry) {
        await redisClient.setEx(key, expiry, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  },

  // Get value
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      throw error;
    }
  },

  // Delete key(s)
  async del(...keys: string[]): Promise<number> {
    try {
      return await redisClient.del(keys);
    } catch (error) {
      logger.error(`Redis DEL error for keys ${keys}:`, error);
      throw error;
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      throw error;
    }
  },

  // Set expiry on existing key
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await redisClient.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      throw error;
    }
  },

  // Increment value
  async incr(key: string): Promise<number> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      throw error;
    }
  },

  // Hash operations
  async hSet(key: string, field: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await redisClient.hSet(key, field, serialized);
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      throw error;
    }
  },

  async hGet<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await redisClient.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      throw error;
    }
  },

  async hGetAll<T = any>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await redisClient.hGetAll(key);
      const parsed: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      throw error;
    }
  },

  // List operations
  async lPush(key: string, ...values: any[]): Promise<number> {
    try {
      const serialized = values.map((v) => JSON.stringify(v));
      return await redisClient.lPush(key, serialized);
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:`, error);
      throw error;
    }
  },

  async lRange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await redisClient.lRange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:`, error);
      throw error;
    }
  },
};

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

export default { connectRedis, getRedisClient, cache, disconnectRedis };
