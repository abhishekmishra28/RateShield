const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'RateShield API',
    version: '1.0.0',
    description:
      'Standalone API Rate Limiting Service. Protects APIs from abuse, excessive traffic, bot attacks, and rate-limit violations.',
    contact: {
      name: 'Abhishek Mishra',
      url: 'https://github.com/abhishekmishra28/RateShield',
    },
    license: {
      name: 'ISC',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development',
    },
  ],
  components: {
    securitySchemes: {
      AdminApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-admin-key',
        description: 'Admin API key for management endpoints',
      },
      ClientApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Client API key for rate-limited endpoints',
      },
    },
    schemas: {
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'My API Client' },
          apiKey: { type: 'string', format: 'uuid' },
          algorithm: { type: 'string', enum: ['TOKEN_BUCKET', 'SLIDING_WINDOW'] },
          burstSize: { type: 'integer', example: 10 },
          refillRate: { type: 'integer', example: 5 },
          windowSize: { type: 'integer', example: 60 },
          maxRequests: { type: 'integer', example: 100 },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateClientInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'My API Client' },
          algorithm: { type: 'string', enum: ['TOKEN_BUCKET', 'SLIDING_WINDOW'], default: 'TOKEN_BUCKET' },
          burstSize: { type: 'integer', minimum: 1, default: 10 },
          refillRate: { type: 'integer', minimum: 1, default: 5 },
          windowSize: { type: 'integer', minimum: 1, default: 60 },
          maxRequests: { type: 'integer', minimum: 1, default: 100 },
        },
      },
      UpdateClientInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          algorithm: { type: 'string', enum: ['TOKEN_BUCKET', 'SLIDING_WINDOW'] },
          burstSize: { type: 'integer', minimum: 1 },
          refillRate: { type: 'integer', minimum: 1 },
          windowSize: { type: 'integer', minimum: 1 },
          maxRequests: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        },
      },
      RateLimitResult: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              allowed: { type: 'boolean' },
              remaining: { type: 'integer' },
              limit: { type: 'integer' },
              retryAfter: { type: 'number', nullable: true },
              algorithm: { type: 'string' },
            },
          },
        },
      },
      Analytics: {
        type: 'object',
        properties: {
          totalRequests: { type: 'integer' },
          allowedRequests: { type: 'integer' },
          rejectedRequests: { type: 'integer' },
          successRate: { type: 'string', example: '85.50%' },
          rejectionRate: { type: 'string', example: '14.50%' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { '$ref': '#/components/schemas/Client' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'RateShield' },
                    uptime: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/check': {
      post: {
        tags: ['Rate Limiter'],
        summary: 'Check rate limit for authenticated client',
        security: [{ ClientApiKey: [] }],
        responses: {
          200: {
            description: 'Request allowed',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/RateLimitResult' } } },
          },
          429: {
            description: 'Rate limit exceeded',
            headers: {
              'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until next request allowed' },
              'X-RateLimit-Limit': { schema: { type: 'integer' } },
              'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            },
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
          },
          401: { description: 'Invalid or missing API key' },
        },
      },
    },
    '/api/v1/admin/clients': {
      post: {
        tags: ['Admin - Clients'],
        summary: 'Create a new client',
        security: [{ AdminApiKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateClientInput' } } },
        },
        responses: {
          201: {
            description: 'Client created',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessResponse' } } },
          },
          400: { description: 'Validation error' },
          403: { description: 'Forbidden - invalid admin key' },
        },
      },
      get: {
        tags: ['Admin - Clients'],
        summary: 'List all clients (paginated)',
        security: [{ AdminApiKey: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } },
          { name: 'algorithm', in: 'query', schema: { type: 'string', enum: ['TOKEN_BUCKET', 'SLIDING_WINDOW'] } },
        ],
        responses: {
          200: {
            description: 'List of clients',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/PaginatedResponse' } } },
          },
        },
      },
    },
    '/api/v1/admin/clients/{id}': {
      get: {
        tags: ['Admin - Clients'],
        summary: 'Get client by ID',
        security: [{ AdminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Client found' },
          404: { description: 'Client not found' },
        },
      },
      put: {
        tags: ['Admin - Clients'],
        summary: 'Update client',
        security: [{ AdminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/UpdateClientInput' } } },
        },
        responses: {
          200: { description: 'Client updated' },
          404: { description: 'Client not found' },
        },
      },
      delete: {
        tags: ['Admin - Clients'],
        summary: 'Delete client',
        security: [{ AdminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Client deleted' },
          404: { description: 'Client not found' },
        },
      },
    },
    '/api/v1/admin/analytics': {
      get: {
        tags: ['Admin - Analytics'],
        summary: 'Get global analytics',
        security: [{ AdminApiKey: [] }],
        responses: {
          200: {
            description: 'Global analytics',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Analytics' } } },
          },
        },
      },
    },
    '/api/v1/admin/analytics/{clientId}': {
      get: {
        tags: ['Admin - Analytics'],
        summary: 'Get analytics for a specific client',
        security: [{ AdminApiKey: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Client analytics' },
        },
      },
      delete: {
        tags: ['Admin - Analytics'],
        summary: 'Reset analytics for a specific client',
        security: [{ AdminApiKey: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Analytics reset' },
        },
      },
    },
  },
};

module.exports = { swaggerDefinition };
