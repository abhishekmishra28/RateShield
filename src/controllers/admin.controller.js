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
    const { page, limit, status, algorithm } = req.query;
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