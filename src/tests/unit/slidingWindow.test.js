/**
 * Unit Tests: Sliding Window Algorithm
 */

describe('Sliding Window Algorithm', () => {
  let slidingWindowService;
  let mockRedis;
  let mockEvalSha;

  beforeEach(() => {
    jest.resetModules();

    mockEvalSha = jest.fn();
    mockRedis = {
      isOpen: true,
      scriptLoad: jest.fn().mockResolvedValue('mock_sha'),
      evalSha: mockEvalSha,
    };

    jest.mock('../../config/redis.config', () => ({
      getRedisClient: () => mockRedis,
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

    slidingWindowService = require('../../services/slidingWindow.service');
  });

  test('should allow request when under limit', async () => {
    mockEvalSha.mockResolvedValue([1, 99, '0']);

    const result = await slidingWindowService.consume('client-1', 60, 100);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
    expect(result.limit).toBe(100);
    expect(result.retryAfter).toBeNull();
    expect(result.algorithm).toBe('SLIDING_WINDOW');
  });

  test('should deny request when window is full', async () => {
    mockEvalSha.mockResolvedValue([0, 0, '15.5']);

    const result = await slidingWindowService.consume('client-1', 60, 100);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(15.5);
  });

  test('should pass correct key pattern', async () => {
    mockEvalSha.mockResolvedValue([1, 50, '0']);

    await slidingWindowService.consume('my-client', 120, 200);

    expect(mockEvalSha).toHaveBeenCalledWith(
      'mock_sha',
      expect.objectContaining({
        keys: ['rateshield:window:my-client'],
        arguments: expect.arrayContaining([
          '120', // windowSize
          '200', // maxRequests
        ]),
      })
    );
  });

  test('should handle NOSCRIPT error gracefully', async () => {
    mockEvalSha
      .mockRejectedValueOnce(new Error('NOSCRIPT No matching script'))
      .mockResolvedValueOnce([1, 49, '0']);

    const result = await slidingWindowService.consume('client-1', 60, 50);

    expect(result.allowed).toBe(true);
    expect(mockRedis.scriptLoad).toHaveBeenCalledTimes(2);
  });
});
