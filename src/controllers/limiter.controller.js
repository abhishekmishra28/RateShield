const { RateLimiterFactory } = require('../services/rateLimiter.strategy');
const analyticsService = require('../services/analytics.service');
const { logger } = require('../config/logger.config');
const { sendSuccess } = require('../utils/response.helper');
const { RateLimitError } = require('../utils/errors');

/**
 * Rate Limiter Controller.
 *
 * Handles the core rate-limiting check:
 * 1. Client is already authenticated via apiKeyAuth middleware (req.client)
 * 2. Select the correct algorithm strategy based on client.algorithm
 * 3. Execute the rate limit check via Redis Lua script
 * 4. Record analytics
 * 5. Return result with standard rate-limit headers
 */
async function checkLimit(req, res, next) {
  try {
    const client = req.client; // Attached by apiKeyAuth middleware

    // Get the appropriate rate limiting strategy
    const strategy = RateLimiterFactory.getStrategy(client.algorithm);

    // Execute the rate limit check (atomic via Redis Lua)
    const result = await strategy.consume(client);

    // Record analytics (fire-and-forget — never blocks response)
    analyticsService.recordRequest(client.id, result.allowed).catch(() => {});

    // Set standard rate-limit response headers
    res.set({
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
      'X-RateLimit-Algorithm': result.algorithm,
    });

    if (!result.allowed) {
      const retryAfter = Math.ceil(result.retryAfter || 1);
      res.set('Retry-After', String(retryAfter));

      logger.warn(
        {
          clientId: client.id,
          clientName: client.name,
          algorithm: client.algorithm,
          remaining: result.remaining,
          retryAfter,
        },
        'Rate limit exceeded'
      );

      return next(new RateLimitError(retryAfter));
    }

    logger.debug(
      {
        clientId: client.id,
        algorithm: client.algorithm,
        remaining: result.remaining,
      },
      'Rate limit check passed'
    );

    return sendSuccess(res, {
      allowed: true,
      remaining: result.remaining,
      limit: result.limit,
      algorithm: result.algorithm,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { checkLimit };