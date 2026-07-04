const clientRepository = require('../repositories/client.repository');
const { getRedisClient } = require('../config/redis.config');
const { logger } = require('../config/logger.config');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Client Service Layer.
 * Contains business logic for client management.
 * Sits between controllers and repository.
 */

async function createClient(data) {
  try {
    const client = await clientRepository.create(data);

    logger.info(
      { clientId: client.id, name: client.name, algorithm: client.algorithm },
      'Client created'
    );

    return client;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError('A client with this name already exists');
    }
    throw error;
  }
}

async function getClient(id) {
  const client = await clientRepository.findById(id);

  if (!client) {
    throw new NotFoundError('Client');
  }

  return client;
}

async function listClients(filters = {}, page = 1, limit = 10) {
  // Ensure page & limit are valid integers before they reach the repository.
  const safePage = Math.max(1, Number.isFinite(Number(page)) ? Math.floor(Number(page)) : 1);
  const safeLimit = Math.min(100, Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 10));

  return clientRepository.findAll(filters, safePage, safeLimit);
}

async function updateClient(id, data) {
  // Verify client exists
  const existing = await clientRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Client');
  }

  const updated = await clientRepository.update(id, data);

  // If algorithm or rate limit config changed, clean up Redis state
  // so the next request creates a fresh bucket/window
  const configChanged =
    data.algorithm !== undefined ||
    data.burstSize !== undefined ||
    data.refillRate !== undefined ||
    data.windowSize !== undefined ||
    data.maxRequests !== undefined;

  if (configChanged) {
    await cleanupRedisState(id);
    logger.info({ clientId: id }, 'Client config changed — Redis state cleared');
  }

  logger.info({ clientId: id, changes: Object.keys(data) }, 'Client updated');

  return updated;
}

async function deleteClient(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Client');
  }

  // Clean up Redis state before deleting from DB
  await cleanupRedisState(id);
  await cleanupAnalytics(id);

  await clientRepository.remove(id);

  logger.info({ clientId: id, name: existing.name }, 'Client deleted');

  return existing;
}

/**
 * Removes rate limiting state from Redis for a client.
 * Called when config changes or client is deleted.
 */
async function cleanupRedisState(clientId) {
  try {
    const redis = getRedisClient();
    await redis.del(`rateshield:bucket:${clientId}`);
    await redis.del(`rateshield:window:${clientId}`);
  } catch (error) {
    logger.warn({ err: error, clientId }, 'Failed to cleanup Redis state');
  }
}

/**
 * Removes analytics counters from Redis for a client.
 */
async function cleanupAnalytics(clientId) {
  try {
    const redis = getRedisClient();
    await redis.del(`rateshield:analytics:${clientId}:total`);
    await redis.del(`rateshield:analytics:${clientId}:allowed`);
    await redis.del(`rateshield:analytics:${clientId}:rejected`);
  } catch (error) {
    logger.warn({ err: error, clientId }, 'Failed to cleanup analytics');
  }
}

module.exports = {
  createClient,
  getClient,
  listClients,
  updateClient,
  deleteClient,
};
