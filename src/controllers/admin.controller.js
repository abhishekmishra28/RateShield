const clientService = require('../services/client.service');
const { sendSuccess, sendPaginated } = require('../utils/response.helper');

/**
 * Admin Controller.
 * Handles CRUD operations for client management.
 * All routes are protected by admin auth middleware.
 */

async function createClient(req, res, next) {
  try {
    const client = await clientService.createClient(req.body);
    return sendSuccess(res, client, 201);
  } catch (error) {
    return next(error);
  }
}

async function getClient(req, res, next) {
  try {
    const client = await clientService.getClient(req.params.id);
    return sendSuccess(res, client);
  } catch (error) {
    return next(error);
  }
}

async function listClients(req, res, next) {
  try {
    const { status, algorithm } = req.query;

    // Safely coerce page & limit to positive integers.
    // The Zod validation middleware should already coerce these, but we
    // apply defense-in-depth here to guard against middleware bypass or
    // future refactors that could pass raw query-string values (strings)
    // to Prisma, which requires integers for skip/take.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filters = {};
    if (status) filters.status = status;
    if (algorithm) filters.algorithm = algorithm;

    const { data, total } = await clientService.listClients(filters, page, limit);
    return sendPaginated(res, data, page, limit, total);
  } catch (error) {
    return next(error);
  }
}

async function updateClient(req, res, next) {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    return sendSuccess(res, client);
  } catch (error) {
    return next(error);
  }
}

async function deleteClient(req, res, next) {
  try {
    const client = await clientService.deleteClient(req.params.id);
    return sendSuccess(res, { message: 'Client deleted', id: client.id });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createClient,
  getClient,
  listClients,
  updateClient,
  deleteClient,
};