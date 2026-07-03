/**
 * Unit Tests: Token Bucket Algorithm
 *
 * Tests the core token bucket logic including:
 * - Token consumption
 * - Capacity limits
 * - Refill behavior
 * - Edge cases
 */

// We test the algorithm logic by mocking Redis
// and verifying the Lua script arguments and results

const { AppError } = require('../../utils/errors');

describe('Token Bucket Algorithm', () => {
  let tokenBucketService;
  let mockRedis;
  let mockEvalSha;

  beforeEach(() => {
    // Reset modules to get fresh mocks
    jest.resetModules();

    mockEvalSha = jest.fn();
    mockRedis = {
      isOpen: true,
      scriptLoad: jest.fn().mockResolvedValue('mock_sha'),
      evalSha: mockEvalSha,
    };

    // Mock redis config
    jest.mock('../../config/redis.config', () => ({
      getRedisClient: () => mockRedis,
    }));

    // Mock logger
    jest.mock('../../config/logger.config', () => ({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Mock fs to avoid reading actual Lua file
    jest.mock('fs', () => ({
      readFileSync: jest.fn().mockReturnValue('mock lua script'),
    }));

    tokenBucketService = require('../../services/tokenBucket.service');
  });

  test('should allow request when tokens are available', async () => {
    mockEvalSha.mockResolvedValue([1, 9, '0']);

    const result = await tokenBucketService.consume('client-1', 10, 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.limit).toBe(10);
    expect(result.retryAfter).toBeNull();
    expect(result.algorithm).toBe('TOKEN_BUCKET');
  });

  test('should deny request when bucket is empty', async () => {
    mockEvalSha.mockResolvedValue([0, 0, '0.2']);

    const result = await tokenBucketService.consume('client-1', 10, 5);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(0.2);
  });

  test('should pass correct arguments to Lua script', async () => {
    mockEvalSha.mockResolvedValue([1, 5, '0']);

    await tokenBucketService.consume('test-client', 20, 10);

    expect(mockEvalSha).toHaveBeenCalledWith(
      'mock_sha',
      expect.objectContaining({
        keys: ['rateshield:bucket:test-client'],
        arguments: expect.arrayContaining([
          '20', // capacity
          '10', // refillRate
        ]),
      })
    );
  });

  test('should reload script on NOSCRIPT error', async () => {
    const noscriptError = new Error('NOSCRIPT No matching script');
    mockEvalSha
      .mockRejectedValueOnce(noscriptError)
      .mockResolvedValueOnce([1, 8, '0']);

    const result = await tokenBucketService.consume('client-1', 10, 5);

    expect(result.allowed).toBe(true);
    expect(mockRedis.scriptLoad).toHaveBeenCalledTimes(2); // initial + reload
  });

  test('should throw on non-NOSCRIPT Redis errors', async () => {
    mockEvalSha.mockRejectedValue(new Error('Redis connection lost'));

    await expect(
      tokenBucketService.consume('client-1', 10, 5)
    ).rejects.toThrow('Redis connection lost');
  });
});
