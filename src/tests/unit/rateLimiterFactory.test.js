/**
 * Unit Tests: Rate Limiter Factory & Strategy Pattern
 */

// Mock dependencies that require env vars before importing strategy
jest.mock('../../config/env.config', () => ({
  env: {
    PORT: 5000,
    NODE_ENV: 'test',
    DATABASE_URL: 'mock',
    REDIS_URL: 'mock',
    ADMIN_API_KEY: 'mock',
    LOG_LEVEL: 'silent',
  },
}));

jest.mock('../../config/redis.config', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('../../config/logger.config', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('mock lua script'),
}));

const {
  RateLimiterFactory,
  TokenBucketStrategy,
  SlidingWindowStrategy,
} = require('../../services/rateLimiter.strategy');

describe('RateLimiterFactory', () => {
  test('should return TokenBucketStrategy for TOKEN_BUCKET', () => {
    const strategy = RateLimiterFactory.getStrategy('TOKEN_BUCKET');
    expect(strategy).toBeInstanceOf(TokenBucketStrategy);
  });

  test('should return SlidingWindowStrategy for SLIDING_WINDOW', () => {
    const strategy = RateLimiterFactory.getStrategy('SLIDING_WINDOW');
    expect(strategy).toBeInstanceOf(SlidingWindowStrategy);
  });

  test('should throw AppError for unknown algorithm', () => {
    expect(() => {
      RateLimiterFactory.getStrategy('LEAKY_BUCKET');
    }).toThrow('Unknown rate limiting algorithm');
  });

  test('should return same instance for same algorithm (singleton)', () => {
    const a = RateLimiterFactory.getStrategy('TOKEN_BUCKET');
    const b = RateLimiterFactory.getStrategy('TOKEN_BUCKET');
    expect(a).toBe(b);
  });
});

describe('Strategy Interface', () => {
  test('TokenBucketStrategy should have consume method', () => {
    const strategy = new TokenBucketStrategy();
    expect(typeof strategy.consume).toBe('function');
  });

  test('SlidingWindowStrategy should have consume method', () => {
    const strategy = new SlidingWindowStrategy();
    expect(typeof strategy.consume).toBe('function');
  });
});
