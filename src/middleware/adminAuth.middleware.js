const { logger } = require('../config/logger.config');
const { ForbiddenError } = require('../utils/errors');

/**
 * Admin Authorization Middleware.
 *
 * Validates the `x-admin-key` header against the ADMIN_API_KEY env var.
 * Protects all management/admin routes.
 */
function adminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey) {
    logger.warn(
      { ip: req.ip, url: req.originalUrl },
      'Admin request missing x-admin-key header'
    );
    return next(new ForbiddenError('Missing admin key. Provide x-admin-key header.'));
  }

  if (adminKey !== process.env.ADMIN_API_KEY) {
    logger.warn(
      { ip: req.ip, url: req.originalUrl },
      'Invalid admin key attempted'
    );
    return next(new ForbiddenError('Invalid admin key.'));
  }

  return next();
}

module.exports = { adminAuth };
