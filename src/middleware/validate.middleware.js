const ApiError = require('../core/errors/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    const { value, error } = schema.validate(
      {
        body: req.body,
        params: req.params,
        query: req.query,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(ApiError.badRequest('Validation failed', errors));
    }

    req.body = value.body || {};
    req.params = value.params || {};
    req.query = value.query || {};

    return next();
  };
};

module.exports = validate;
