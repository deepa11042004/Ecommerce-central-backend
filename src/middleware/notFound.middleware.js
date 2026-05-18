const ApiError = require('../core/errors/ApiError');

const notFoundMiddleware = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = notFoundMiddleware;
