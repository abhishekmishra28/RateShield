const { logger } = require('../config/logger.config');
const { UnauthorizedError } = require('../utils/errors');
const prisma = require('../config/prisma');

/**
 * API Key Authentication Middleware.
 *
 * Validates the `x-api-key` header, looks up the client in the database,
 * and attaches the client object to `req.client` for downstream use.
 *
 * Rejects requests with missing, invalid, or inactive API keys.
 */
async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn(
      { ip: req.ip, url: req.originalUrl },
      'Request missing x-api-key header'
    );
    return next(new UnauthorizedError('Missing API key. Provide x-api-key header.'));
  }

  try {
    const client = await prisma.client.findUnique({
      where: { apiKey },
    });

    if (!client) {
      logger.warn(
        { ip: req.ip, apiKey: apiKey.substring(0, 8) + '***' },
        'Invalid API key used'
      );
      return next(new UnauthorizedError('Invalid API key.'));
    }

    if (client.status !== 'ACTIVE') {
      logger.warn(
        { clientId: client.id, status: client.status },
        'Inactive client attempted access'
      );
      return next(new UnauthorizedError(`Client is ${client.status.toLowerCase()}. Contact administrator.`));
    }

    // Attach client to request for downstream use
    req.client = client;
    return next();
  } catch (error) {
    logger.error({ err: error }, 'Error during API key authentication');
    return next(error);
  }
}

module.exports = { apiKeyAuth };
