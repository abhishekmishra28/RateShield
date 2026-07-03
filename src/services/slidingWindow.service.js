const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getRedisClient } = require('../config/redis.config');
const { logger } = require('../config/logger.config');

// Load Lua script at module initialization
const LUA_SCRIPT = fs.readFileSync(
  path.join(__dirname, 'lua', 'slidingWindow.lua'),
  'utf8'
);

let scriptSha = null;

/**
 * Redis-backed Sliding Window Log Rate Limiter.
 *
 * Uses a sorted set where each entry's score is the request timestamp.
 * On each request:
 *   1. Remove entries outside the current window (ZREMRANGEBYSCORE)
 *   2. Count remaining entries (ZCARD)
 *   3. If under limit, add new entry (ZADD)
 *
 * All done atomically via Lua script to prevent race conditions.
 *
 * @param {string} clientId - Unique client identifier
 * @param {number} windowSize - Window duration in seconds
 * @param {number} maxRequests - Max requests allowed per window
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfter: number}>}
 */
async function consume(clientId, windowSize, maxRequests) {
  const redis = getRedisClient();
  const key = `rateshield:window:${clientId}`;
  const now = Date.now() / 1000;
  const requestId = `${now}:${randomUUID()}`;

  try {
    if (!scriptSha) {
      scriptSha = await redis.scriptLoad(LUA_SCRIPT);
      logger.debug('Sliding window Lua script loaded');
    }

    let result;
    try {
      result = await redis.evalSha(scriptSha, {
        keys: [key],
        arguments: [String(windowSize), String(maxRequests), String(now), requestId],
      });
    } catch (err) {
      if (err.message.includes('NOSCRIPT')) {
        scriptSha = await redis.scriptLoad(LUA_SCRIPT);
        result = await redis.evalSha(scriptSha, {
          keys: [key],
          arguments: [String(windowSize), String(maxRequests), String(now), requestId],
        });
      } else {
        throw err;
      }
    }

    const allowed = Number(result[0]) === 1;
    const remaining = Number(result[1]);
    const retryAfter = parseFloat(result[2]);

    return {
      allowed,
      remaining,
      limit: maxRequests,
      retryAfter: allowed ? null : retryAfter,
      algorithm: 'SLIDING_WINDOW',
    };
  } catch (error) {
    logger.error({ err: error, clientId }, 'Sliding window consume failed');
    throw error;
  }
}

module.exports = { consume };
