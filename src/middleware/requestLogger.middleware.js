const { logger } = require('../config/logger.config');
const { randomUUID } = require('crypto');

/**
 * HTTP Request Logger Middleware.
 *
 * Logs every incoming request with method, URL, status, and duration.
 * Assigns a unique request ID for correlation.
 */
function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const startTime = Date.now();

  // Attach request ID for downstream use
  req.id = requestId;
  res.set('X-Request-Id', requestId);

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    } else {
      logger.info(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });

  return next();
}

module.exports = { requestLogger };
