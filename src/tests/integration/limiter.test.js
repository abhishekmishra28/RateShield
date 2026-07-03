/**
 * Integration Tests: Rate Limiter API
 *
 * Tests the rate limiting endpoint with mocked Redis and Prisma.
 */

const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test_admin_key_12345';
process.env.LOG_LEVEL = 'silent';

const mockEvalSha = jest.fn();

jest.mock('../../config/redis.config', () => ({
  getRedisClient: () => ({
    isOpen: true,
    scriptLoad: jest.fn().mockResolvedValue('mock_sha'),
    evalSha: mockEvalSha,
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue('0'),
    incr: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
  connectRedis: jest.fn().mockResolvedValue({}),
  disconnectRedis: jest.fn().mockResolvedValue({}),
}));

const mockPrismaClient = {
  create: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../config/prisma', () => ({
  client: mockPrismaClient,
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

jest.mock('../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));

// Need to also mock fs for the Lua file reads
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('mock lua script'),
}));

const app = require('../../../app');

const MOCK_CLIENT = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Client',
  apiKey: 'test-api-key-123',
  algorithm: 'TOKEN_BUCKET',
  burstSize: 10,
  refillRate: 5,
  windowSize: 60,
  maxRequests: 100,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Rate Limiter - POST /api/v1/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should allow request when tokens available', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(MOCK_CLIENT);
    mockEvalSha.mockResolvedValue([1, 9, '0']);

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'test-api-key-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.allowed).toBe(true);
    expect(res.body.data.remaining).toBe(9);
    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(res.headers['x-ratelimit-remaining']).toBe('9');
    expect(res.headers['x-ratelimit-algorithm']).toBe('TOKEN_BUCKET');
  });

  test('should return 429 when rate limited', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(MOCK_CLIENT);
    mockEvalSha.mockResolvedValue([0, 0, '2.5']);

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'test-api-key-123');

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  test('should return 401 without API key', async () => {
    const res = await request(app)
      .post('/api/v1/check');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('should return 401 with invalid API key', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'invalid-key');

    expect(res.status).toBe(401);
  });

  test('should return 401 for inactive client', async () => {
    mockPrismaClient.findUnique.mockResolvedValue({
      ...MOCK_CLIENT,
      status: 'SUSPENDED',
    });

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'test-api-key-123');

    expect(res.status).toBe(401);
  });

  test('should work with SLIDING_WINDOW algorithm', async () => {
    mockPrismaClient.findUnique.mockResolvedValue({
      ...MOCK_CLIENT,
      algorithm: 'SLIDING_WINDOW',
    });
    mockEvalSha.mockResolvedValue([1, 99, '0']);

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'test-api-key-123');

    expect(res.status).toBe(200);
    expect(res.body.data.allowed).toBe(true);
    expect(res.headers['x-ratelimit-algorithm']).toBe('SLIDING_WINDOW');
  });

  test('should include rate limit headers on allowed requests', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(MOCK_CLIENT);
    mockEvalSha.mockResolvedValue([1, 5, '0']);

    const res = await request(app)
      .post('/api/v1/check')
      .set('x-api-key', 'test-api-key-123');

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-algorithm']).toBeDefined();
  });
});
