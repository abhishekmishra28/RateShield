const tokenBucketService = require('./tokenBucket.service');
const slidingWindowService = require('./slidingWindow.service');
const { AppError } = require('../utils/errors');

/**
 * Rate Limiter Strategy Pattern.
 *
 * Each strategy implements a `consume(client)` method that:
 *   1. Reads client configuration
 *   2. Calls the appropriate Redis-backed algorithm
 *   3. Returns a standardized result
 *
 * The Factory selects the correct strategy based on client.algorithm.
 *
 * Design Pattern: Strategy + Factory
 * - Strategy: each algorithm is a separate class with the same interface
 * - Factory: RateLimiterFactory.getStrategy() returns the right one
 *
 * This makes adding new algorithms trivial — just add a new strategy class
 * and a case in the factory switch.
 */

class RateLimiterStrategy {
  /**
   * @param {Object} client - Client configuration from database
   * @returns {Promise<{allowed: boolean, remaining: number, limit: number, retryAfter: number|null, algorithm: string}>}
   */
  async consume(client) {
    throw new Error('consume() must be implemented by subclass');
  }
}

class TokenBucketStrategy extends RateLimiterStrategy {
  async consume(client) {
    return tokenBucketService.consume(
      client.id,
      client.burstSize,
      client.refillRate
    );
  }
}

class SlidingWindowStrategy extends RateLimiterStrategy {
  async consume(client) {
    return slidingWindowService.consume(
      client.id,
      client.windowSize,
      client.maxRequests
    );
  }
}

/**
 * Factory for creating rate limiter strategy instances.
 * Uses singleton instances since strategies are stateless.
 */
class RateLimiterFactory {
  static strategies = {
    TOKEN_BUCKET: new TokenBucketStrategy(),
    SLIDING_WINDOW: new SlidingWindowStrategy(),
  };

  /**
   * @param {string} algorithm - Algorithm name from client configuration
   * @returns {RateLimiterStrategy}
   */
  static getStrategy(algorithm) {
    const strategy = RateLimiterFactory.strategies[algorithm];

    if (!strategy) {
      throw new AppError(
        `Unknown rate limiting algorithm: ${algorithm}. Supported: TOKEN_BUCKET, SLIDING_WINDOW`,
        400,
        'INVALID_ALGORITHM'
      );
    }

    return strategy;
  }
}

module.exports = {
  RateLimiterStrategy,
  TokenBucketStrategy,
  SlidingWindowStrategy,
  RateLimiterFactory,
};
