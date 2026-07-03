/**
 * Integration Tests: Admin API
 *
 * Tests the full admin CRUD lifecycle using supertest.
 * Requires running PostgreSQL and Redis (or mocks).
 */

const request = require('supertest');

// Set env before requiring app
process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test_admin_key_12345';
process.env.LOG_LEVEL = 'silent';

const ADMIN_KEY = 'test_admin_key_12345';

// Mock Redis for integration tests
jest.mock('../../config/redis.config', () => ({
  getRedisClient: () => ({
    isOpen: true,
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue('0'),
    incr: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      decrBy: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
  connectRedis: jest.fn().mockResolvedValue({}),
  disconnectRedis: jest.fn().mockResolvedValue({}),
}));

// Mock Prisma
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

const app = require('../../../app');

describe('Admin API - POST /api/v1/admin/clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a client with valid input', async () => {
    const mockClient = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Client',
      apiKey: '660e8400-e29b-41d4-a716-446655440001',
      algorithm: 'TOKEN_BUCKET',
      burstSize: 10,
      refillRate: 5,
      windowSize: 60,
      maxRequests: 100,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockPrismaClient.create.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/v1/admin/clients')
      .set('x-admin-key', ADMIN_KEY)
      .send({ name: 'Test Client' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Client');
    expect(res.body.data.apiKey).toBeDefined();
  });

  test('should reject request without admin key', async () => {
    const res = await request(app)
      .post('/api/v1/admin/clients')
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('should reject invalid admin key', async () => {
    const res = await request(app)
      .post('/api/v1/admin/clients')
      .set('x-admin-key', 'wrong_key')
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });

  test('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/v1/admin/clients')
      .set('x-admin-key', ADMIN_KEY)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject invalid algorithm', async () => {
    const res = await request(app)
      .post('/api/v1/admin/clients')
      .set('x-admin-key', ADMIN_KEY)
      .send({ name: 'Test', algorithm: 'INVALID' });

    expect(res.status).toBe(400);
  });
});

describe('Admin API - GET /api/v1/admin/clients', () => {
  test('should list clients with pagination', async () => {
    mockPrismaClient.findMany.mockResolvedValue([
      { id: '1', name: 'Client 1' },
      { id: '2', name: 'Client 2' },
    ]);
    mockPrismaClient.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/v1/admin/clients')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBe(2);
  });

  test('should support query filters', async () => {
    mockPrismaClient.findMany.mockResolvedValue([]);
    mockPrismaClient.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/admin/clients?status=ACTIVE&algorithm=TOKEN_BUCKET&page=1&limit=5')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
  });
});

describe('Admin API - GET /api/v1/admin/clients/:id', () => {
  test('should get client by ID', async () => {
    const mockClient = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Client',
    };

    mockPrismaClient.findUnique.mockResolvedValue(mockClient);

    const res = await request(app)
      .get('/api/v1/admin/clients/550e8400-e29b-41d4-a716-446655440000')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Client');
  });

  test('should return 404 for non-existent client', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/admin/clients/550e8400-e29b-41d4-a716-446655440000')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(404);
  });

  test('should reject invalid UUID', async () => {
    const res = await request(app)
      .get('/api/v1/admin/clients/not-a-uuid')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(400);
  });
});

describe('Admin API - PUT /api/v1/admin/clients/:id', () => {
  const clientId = '550e8400-e29b-41d4-a716-446655440000';

  test('should update client', async () => {
    const mockClient = { id: clientId, name: 'Old Name', algorithm: 'TOKEN_BUCKET' };
    const updatedClient = { ...mockClient, name: 'New Name' };

    mockPrismaClient.findUnique.mockResolvedValue(mockClient);
    mockPrismaClient.update.mockResolvedValue(updatedClient);

    const res = await request(app)
      .put(`/api/v1/admin/clients/${clientId}`)
      .set('x-admin-key', ADMIN_KEY)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  test('should reject empty update', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/clients/${clientId}`)
      .set('x-admin-key', ADMIN_KEY)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Admin API - DELETE /api/v1/admin/clients/:id', () => {
  const clientId = '550e8400-e29b-41d4-a716-446655440000';

  test('should delete client', async () => {
    const mockClient = { id: clientId, name: 'Test Client' };

    mockPrismaClient.findUnique.mockResolvedValue(mockClient);
    mockPrismaClient.delete.mockResolvedValue(mockClient);

    const res = await request(app)
      .delete(`/api/v1/admin/clients/${clientId}`)
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Client deleted');
  });

  test('should return 404 for non-existent client', async () => {
    mockPrismaClient.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/v1/admin/clients/${clientId}`)
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(404);
  });
});

describe('Health Check', () => {
  test('should return healthy status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('RateShield');
    expect(res.body.uptime).toBeDefined();
  });
});

describe('404 Handler', () => {
  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
