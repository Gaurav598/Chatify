import config from "./index.js";
import logger from "./logger.js";

/**
 * Redis-compatible cache with in-memory fallback.
 * When REDIS_URL is not configured, uses a Map-based LRU cache.
 */

let redisClient = null;
let isRedisAvailable = false;

// In-memory fallback cache
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 10000;
const ttlTimers = new Map();

function evictOldest() {
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
    if (ttlTimers.has(firstKey)) {
      clearTimeout(ttlTimers.get(firstKey));
      ttlTimers.delete(firstKey);
    }
  }
}

export async function initRedis() {
  if (!config.redis.url) {
    logger.info("Redis URL not configured — using in-memory cache fallback");
    return;
  }

  try {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    await redisClient.connect();
    isRedisAvailable = true;
    logger.info("Redis connected successfully");

    redisClient.on("error", (err) => {
      logger.error("Redis error:", err.message);
      isRedisAvailable = false;
    });

    redisClient.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });

    redisClient.on("ready", () => {
      isRedisAvailable = true;
      logger.info("Redis ready");
    });
  } catch (error) {
    logger.warn("Redis connection failed — using in-memory cache fallback:", error.message);
    isRedisAvailable = false;
  }
}

export const cache = {
  async get(key) {
    if (isRedisAvailable && redisClient) {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    }
    const entry = memoryCache.get(key);
    return entry !== undefined ? entry : null;
  },

  async set(key, value, ttlSeconds = 3600) {
    if (isRedisAvailable && redisClient) {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      return;
    }
    evictOldest();
    memoryCache.set(key, value);
    if (ttlTimers.has(key)) clearTimeout(ttlTimers.get(key));
    const timer = setTimeout(() => {
      memoryCache.delete(key);
      ttlTimers.delete(key);
    }, ttlSeconds * 1000);
    ttlTimers.set(key, timer);
  },

  async del(key) {
    if (isRedisAvailable && redisClient) {
      await redisClient.del(key);
      return;
    }
    memoryCache.delete(key);
    if (ttlTimers.has(key)) {
      clearTimeout(ttlTimers.get(key));
      ttlTimers.delete(key);
    }
  },

  async delPattern(pattern) {
    if (isRedisAvailable && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(...keys);
      return;
    }
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        if (ttlTimers.has(key)) {
          clearTimeout(ttlTimers.get(key));
          ttlTimers.delete(key);
        }
      }
    }
  },

  async flush() {
    if (isRedisAvailable && redisClient) {
      await redisClient.flushdb();
      return;
    }
    memoryCache.clear();
    for (const timer of ttlTimers.values()) clearTimeout(timer);
    ttlTimers.clear();
  },

  getClient() {
    return redisClient;
  },

  isAvailable() {
    return isRedisAvailable;
  },
};

export default cache;
