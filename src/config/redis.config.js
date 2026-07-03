const { createClient } = require('redis');
const { env } = require('./env.config');

let redisClient = null;

/**
 * Creates and connects a Redis client singleton.
 * Handles connection errors and reconnection.
 */
async function connectRedis() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Redis max reconnect attempts reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisClient.on('reconnecting', () => {
    console.warn('⚠️  Redis reconnecting...');
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Returns the active Redis client. Throws if not connected.
 */
function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client is not connected. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Gracefully disconnects from Redis.
 */
async function disconnectRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('🔌 Redis disconnected');
  }
}

module.exports = { connectRedis, getRedisClient, disconnectRedis };
