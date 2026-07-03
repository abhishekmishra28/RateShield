const { getRedisClient } = require('../config/redis.config');
const { logger } = require('../config/logger.config');

/**
 * Analytics Service.
 *
 * Tracks rate limiting metrics using Redis atomic counters.
 * Provides per-client and global analytics.
 *
 * Redis Keys:
 *   rateshield:analytics:{clientId}:total    – total requests
 *   rateshield:analytics:{clientId}:allowed  – allowed requests
 *   rateshield:analytics:{clientId}:rejected – rejected requests
 *   rateshield:analytics:global:total        – global total
 *   rateshield:analytics:global:allowed      – global allowed
 *   rateshield:analytics:global:rejected     – global rejected
 */

/**
 * Record a rate limit check result.
 * Increments both per-client and global counters atomically.
 *
 * @param {string} clientId
 * @param {boolean} allowed - Whether the request was allowed
 */
async function recordRequest(clientId, allowed) {
  try {
    const redis = getRedisClient();
    const pipeline = redis.multi();

    // Per-client counters
    pipeline.incr(`rateshield:analytics:${clientId}:total`);
    pipeline.incr(`rateshield:analytics:global:total`);

    if (allowed) {
      pipeline.incr(`rateshield:analytics:${clientId}:allowed`);
      pipeline.incr(`rateshield:analytics:global:allowed`);
    } else {
      pipeline.incr(`rateshield:analytics:${clientId}:rejected`);
      pipeline.incr(`rateshield:analytics:global:rejected`);
    }

    await pipeline.exec();
  } catch (error) {
    // Analytics should never break the main flow
    logger.warn({ err: error, clientId }, 'Failed to record analytics');
  }
}

/**
 * Get analytics for a specific client.
 */
async function getClientAnalytics(clientId) {
  const redis = getRedisClient();

  const [total, allowed, rejected] = await Promise.all([
    redis.get(`rateshield:analytics:${clientId}:total`),
    redis.get(`rateshield:analytics:${clientId}:allowed`),
    redis.get(`rateshield:analytics:${clientId}:rejected`),
  ]);

  return formatAnalytics(
    parseInt(total || '0', 10),
    parseInt(allowed || '0', 10),
    parseInt(rejected || '0', 10)
  );
}

/**
 * Get global analytics across all clients.
 */
async function getGlobalAnalytics() {
  const redis = getRedisClient();

  const [total, allowed, rejected] = await Promise.all([
    redis.get('rateshield:analytics:global:total'),
    redis.get('rateshield:analytics:global:allowed'),
    redis.get('rateshield:analytics:global:rejected'),
  ]);

  return formatAnalytics(
    parseInt(total || '0', 10),
    parseInt(allowed || '0', 10),
    parseInt(rejected || '0', 10)
  );
}

/**
 * Reset analytics for a specific client.
 */
async function resetClientAnalytics(clientId) {
  const redis = getRedisClient();

  // Get current values to subtract from global
  const [total, allowed, rejected] = await Promise.all([
    redis.get(`rateshield:analytics:${clientId}:total`),
    redis.get(`rateshield:analytics:${clientId}:allowed`),
    redis.get(`rateshield:analytics:${clientId}:rejected`),
  ]);

  const pipeline = redis.multi();

  // Decrement global counters
  if (total) pipeline.decrBy('rateshield:analytics:global:total', parseInt(total, 10));
  if (allowed) pipeline.decrBy('rateshield:analytics:global:allowed', parseInt(allowed, 10));
  if (rejected) pipeline.decrBy('rateshield:analytics:global:rejected', parseInt(rejected, 10));

  // Delete client counters
  pipeline.del(`rateshield:analytics:${clientId}:total`);
  pipeline.del(`rateshield:analytics:${clientId}:allowed`);
  pipeline.del(`rateshield:analytics:${clientId}:rejected`);

  await pipeline.exec();

  logger.info({ clientId }, 'Client analytics reset');
}

/**
 * Format raw counter values into an analytics object with rates.
 */
function formatAnalytics(total, allowed, rejected) {
  const successRate = total > 0 ? ((allowed / total) * 100).toFixed(2) : '0.00';
  const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(2) : '0.00';

  return {
    totalRequests: total,
    allowedRequests: allowed,
    rejectedRequests: rejected,
    successRate: `${successRate}%`,
    rejectionRate: `${rejectionRate}%`,
  };
}

module.exports = {
  recordRequest,
  getClientAnalytics,
  getGlobalAnalytics,
  resetClientAnalytics,
};
