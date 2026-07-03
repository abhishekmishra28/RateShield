const { z } = require('zod');

/**
 * Zod Validation Schemas for Client operations.
 */

const createClientSchema = z.object({
  name: z
    .string({ required_error: 'Client name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  algorithm: z
    .enum(['TOKEN_BUCKET', 'SLIDING_WINDOW'], {
      invalid_type_error: 'Algorithm must be TOKEN_BUCKET or SLIDING_WINDOW',
    })
    .default('TOKEN_BUCKET'),
  burstSize: z
    .number()
    .int('burstSize must be an integer')
    .min(1, 'burstSize must be at least 1')
    .max(10000, 'burstSize must not exceed 10000')
    .default(10),
  refillRate: z
    .number()
    .int('refillRate must be an integer')
    .min(1, 'refillRate must be at least 1')
    .max(10000, 'refillRate must not exceed 10000')
    .default(5),
  windowSize: z
    .number()
    .int('windowSize must be an integer')
    .min(1, 'windowSize must be at least 1 second')
    .max(86400, 'windowSize must not exceed 86400 seconds (24h)')
    .default(60),
  maxRequests: z
    .number()
    .int('maxRequests must be an integer')
    .min(1, 'maxRequests must be at least 1')
    .max(100000, 'maxRequests must not exceed 100000')
    .default(100),
});

const updateClientSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .trim()
      .optional(),
    algorithm: z
      .enum(['TOKEN_BUCKET', 'SLIDING_WINDOW'], {
        invalid_type_error: 'Algorithm must be TOKEN_BUCKET or SLIDING_WINDOW',
      })
      .optional(),
    burstSize: z
      .number()
      .int('burstSize must be an integer')
      .min(1)
      .max(10000)
      .optional(),
    refillRate: z
      .number()
      .int('refillRate must be an integer')
      .min(1)
      .max(10000)
      .optional(),
    windowSize: z
      .number()
      .int('windowSize must be an integer')
      .min(1)
      .max(86400)
      .optional(),
    maxRequests: z
      .number()
      .int('maxRequests must be an integer')
      .min(1)
      .max(100000)
      .optional(),
    status: z
      .enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
        invalid_type_error: 'Status must be ACTIVE, INACTIVE, or SUSPENDED',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const clientIdParamSchema = z.object({
  id: z.string().uuid('Invalid client ID format'),
});

const clientIdParamSchemaAlt = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
});

const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  algorithm: z.enum(['TOKEN_BUCKET', 'SLIDING_WINDOW']).optional(),
});

module.exports = {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  clientIdParamSchemaAlt,
  listClientsQuerySchema,
};
