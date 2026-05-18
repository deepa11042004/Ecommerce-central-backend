const { sendError } = require('../core/http/response');

const errorMiddleware = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let errors = Array.isArray(error.errors) ? error.errors : [];

  if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate resource';
    errors = error.errors.map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (error.name === 'SequelizeValidationError') {
    statusCode = 422;
    message = 'Database validation failed';
    errors = error.errors.map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
    errors = [];
  }

  return sendError(res, {
    statusCode,
    message,
    errors,
  });
};

module.exports = errorMiddleware;
