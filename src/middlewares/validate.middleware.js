// src/middlewares/validate.middleware.js
const { ApiError } = require('../utils/ApiError');

/**
 * Validates req.body / req.query / req.params against a Joi schema.
 * Usage: router.post('/route', validate(schema), controller)
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req[source] = value; // replace with stripped + coerced value
  next();
};

module.exports = { validate };
