const prisma = require('../config/prisma');

/**
 * Client Repository Layer.
 * Handles all database operations for the Client model.
 * No business logic — pure data access.
 */

async function create(data) {
  return prisma.client.create({
    data,
  });
}

async function findById(id) {
  return prisma.client.findUnique({
    where: { id },
  });
}

async function findByApiKey(apiKey) {
  return prisma.client.findUnique({
    where: { apiKey },
  });
}

async function findAll(filters = {}, page = 1, limit = 10) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.algorithm) {
    where.algorithm = filters.algorithm;
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count({ where }),
  ]);

  return { data, total };
}

async function update(id, data) {
  return prisma.client.update({
    where: { id },
    data,
  });
}

async function remove(id) {
  return prisma.client.delete({
    where: { id },
  });
}

module.exports = {
  create,
  findById,
  findByApiKey,
  findAll,
  update,
  remove,
};