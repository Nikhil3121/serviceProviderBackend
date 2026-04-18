// src/config/redis.js
const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = () => {
  const config = process.env.REDIS_URL
    ? { lazyConnect: true }
    : {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 5) {
            logger.warn('Redis: Max retry attempts reached. Running without cache.');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        enableOfflineQueue: false,
      };

  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, config)
    : new Redis(config);

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('error', (err) => logger.warn(`Redis error (non-fatal): ${err.message}`));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = connectRedis();
  }
  return redisClient;
};

// Cache helpers
const cache = {
  async get(key) {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      const client = getRedisClient();
      await client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  },

  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(...keys);
      return true;
    } catch {
      return false;
    }
  },

  async exists(key) {
    try {
      const client = getRedisClient();
      return await client.exists(key);
    } catch {
      return false;
    }
  },
};

module.exports = { getRedisClient, cache };
