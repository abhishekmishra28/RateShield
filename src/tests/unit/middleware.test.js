/**
 * Unit Tests: Middleware
 */

describe('Admin Auth Middleware', () => {
  let adminAuth;

  beforeEach(() => {
    jest.resetModules();
    process.env.ADMIN_API_KEY = 'test_admin_key_12345';

    jest.mock('../../config/logger.config', () => ({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    ({ adminAuth } = require('../../middleware/adminAuth.middleware'));
  });

  test('should call next() with valid admin key', () => {
    const req = {
      headers: { 'x-admin-key': 'test_admin_key_12345' },
      ip: '127.0.0.1',
      originalUrl: '/api/v1/admin/clients',
    };
    const res = {};
    const next = jest.fn();

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('should return ForbiddenError with missing admin key', () => {
    const req = { headers: {}, ip: '127.0.0.1', originalUrl: '/test' };
    const res = {};
    const next = jest.fn();

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
      })
    );
  });

  test('should return ForbiddenError with wrong admin key', () => {
    const req = {
      headers: { 'x-admin-key': 'wrong_key' },
      ip: '127.0.0.1',
      originalUrl: '/test',
    };
    const res = {};
    const next = jest.fn();

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });
});

describe('Validate Middleware', () => {
  let validate;

  beforeEach(() => {
    jest.resetModules();
    ({ validate } = require('../../middleware/validate.middleware'));
  });

  test('should call next() with valid body', () => {
    const { z } = require('zod');
    const schema = z.object({ name: z.string() });

    const req = { body: { name: 'Test' } };
    const res = {};
    const next = jest.fn();

    validate(schema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Test' });
  });

  test('should return ValidationError for invalid body', () => {
    const { z } = require('zod');
    const schema = z.object({ name: z.string() });

    const req = { body: { name: 123 } };
    const res = {};
    const next = jest.fn();

    validate(schema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      })
    );
  });

  test('should validate query params', () => {
    const { z } = require('zod');
    const schema = z.object({ page: z.coerce.number().default(1) });

    const req = { query: {} };
    const res = {};
    const next = jest.fn();

    validate(schema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.page).toBe(1);
  });
});

describe('Error Handler Middleware', () => {
  let errorHandler;
  let mockLogger;

  beforeEach(() => {
    jest.resetModules();

    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    jest.mock('../../config/logger.config', () => ({
      logger: mockLogger,
    }));

    ({ errorHandler } = require('../../middleware/errorHandler.middleware'));
  });

  test('should handle AppError with correct status', () => {
    const { NotFoundError } = require('../../utils/errors');
    const err = new NotFoundError('Client');
    const req = { method: 'GET', originalUrl: '/test', ip: '127.0.0.1' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      })
    );
  });

  test('should handle RateLimitError with Retry-After header', () => {
    const { RateLimitError } = require('../../utils/errors');
    const err = new RateLimitError(5);
    const req = { method: 'POST', originalUrl: '/check', ip: '127.0.0.1' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '5');
  });

  test('should hide details for non-operational errors', () => {
    const err = new Error('Database connection failed');
    const req = { method: 'GET', originalUrl: '/test', ip: '127.0.0.1' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      })
    );
  });
});
