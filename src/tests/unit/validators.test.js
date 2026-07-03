/**
 * Unit Tests: Zod Validators
 */

const {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  listClientsQuerySchema,
} = require('../../validators/client.validator');

describe('createClientSchema', () => {
  test('should accept valid input with defaults', () => {
    const result = createClientSchema.safeParse({ name: 'My Client' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('My Client');
    expect(result.data.algorithm).toBe('TOKEN_BUCKET');
    expect(result.data.burstSize).toBe(10);
    expect(result.data.refillRate).toBe(5);
    expect(result.data.windowSize).toBe(60);
    expect(result.data.maxRequests).toBe(100);
  });

  test('should accept full valid input', () => {
    const result = createClientSchema.safeParse({
      name: 'Premium Client',
      algorithm: 'SLIDING_WINDOW',
      burstSize: 50,
      refillRate: 20,
      windowSize: 120,
      maxRequests: 500,
    });
    expect(result.success).toBe(true);
    expect(result.data.algorithm).toBe('SLIDING_WINDOW');
  });

  test('should reject missing name', () => {
    const result = createClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('should reject name shorter than 2 characters', () => {
    const result = createClientSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  test('should reject invalid algorithm', () => {
    const result = createClientSchema.safeParse({
      name: 'Test',
      algorithm: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  test('should reject burstSize of 0', () => {
    const result = createClientSchema.safeParse({
      name: 'Test',
      burstSize: 0,
    });
    expect(result.success).toBe(false);
  });

  test('should reject burstSize exceeding 10000', () => {
    const result = createClientSchema.safeParse({
      name: 'Test',
      burstSize: 99999,
    });
    expect(result.success).toBe(false);
  });

  test('should trim whitespace from name', () => {
    const result = createClientSchema.safeParse({ name: '  My Client  ' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('My Client');
  });
});

describe('updateClientSchema', () => {
  test('should accept partial update', () => {
    const result = updateClientSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  test('should accept status change', () => {
    const result = updateClientSchema.safeParse({ status: 'SUSPENDED' });
    expect(result.success).toBe(true);
  });

  test('should reject empty update', () => {
    const result = updateClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('should reject invalid status', () => {
    const result = updateClientSchema.safeParse({ status: 'DELETED' });
    expect(result.success).toBe(false);
  });
});

describe('clientIdParamSchema', () => {
  test('should accept valid UUID', () => {
    const result = clientIdParamSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  test('should reject non-UUID string', () => {
    const result = clientIdParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  test('should reject numeric ID', () => {
    const result = clientIdParamSchema.safeParse({ id: '123' });
    expect(result.success).toBe(false);
  });
});

describe('listClientsQuerySchema', () => {
  test('should provide defaults for empty query', () => {
    const result = listClientsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  test('should coerce string numbers', () => {
    const result = listClientsQuerySchema.safeParse({
      page: '3',
      limit: '25',
    });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(3);
    expect(result.data.limit).toBe(25);
  });

  test('should accept optional filters', () => {
    const result = listClientsQuerySchema.safeParse({
      status: 'ACTIVE',
      algorithm: 'TOKEN_BUCKET',
    });
    expect(result.success).toBe(true);
  });

  test('should reject limit over 100', () => {
    const result = listClientsQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});
