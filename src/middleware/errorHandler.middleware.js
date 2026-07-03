const { logger } = require('../config/logger.config');
const { AppError } = require('../utils/errors');

/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and sends consistent responses.
 *
 * Operational errors (AppError): expected errors, send the error message.
 * Programming errors: unexpected, log full error, send generic message.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Default values for unexpected errors
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = null;

  if (err instanceof AppError) {
    // Operational error — safe to expose to client
    if (err.details) {
      details = err.details;
    }

    logger.warn(
      {
        err: {
          code,
          message,
          statusCode,
        },
        req: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
        },
      },
      `Operational error: ${message}`
    );
  } else {
    // Programming or unknown error — log full stack, hide details from client
    statusCode = 500;
    code = 'INTERNAL_ERROR';
    message = 'An unexpected error occurred';

    logger.error(
      {
        err: {
          message: err.message,
          stack: err.stack,
          name: err.name,
        },
        req: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
        },
      },
      `Unhandled error: ${err.message}`
    );
  }

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  // Rate limit specific headers
  if (err.retryAfter) {
    res.set('Retry-After', String(Math.ceil(err.retryAfter)));
  }

  return res.status(statusCode).json(response);
}

module.exports = { errorHandler };
