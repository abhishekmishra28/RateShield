const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response.helper');

/**
 * Analytics Controller.
 * Provides endpoints for viewing and managing rate limiting analytics.
 * All routes are protected by admin auth middleware.
 */

async function getGlobalAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getGlobalAnalytics();
    return sendSuccess(res, analytics);
  } catch (error) {
    return next(error);
  }
}

async function getClientAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getClientAnalytics(req.params.clientId);
    return sendSuccess(res, analytics);
  } catch (error) {
    return next(error);
  }
}

async function resetClientAnalytics(req, res, next) {
  try {
    await analyticsService.resetClientAnalytics(req.params.clientId);
    return sendSuccess(res, { message: 'Analytics reset successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getGlobalAnalytics,
  getClientAnalytics,
  resetClientAnalytics,
};
