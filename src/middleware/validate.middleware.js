const { ValidationError } = require('../utils/errors');

/**
 * Generic Zod Validation Middleware Factory.
 *
 * Creates middleware that validates a specific part of the request
 * (body, params, or query) against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} source - Which part of the request to validate
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/clients', validate(createClientSchema, 'body'), createClient);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace with parsed/coerced values
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
