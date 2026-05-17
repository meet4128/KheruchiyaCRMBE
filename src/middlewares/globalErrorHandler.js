const AppError = require('../utils/AppError');
const { log } = require('../utils/logger');
const { messages } = require('../locales');

/**
 * Global error handler middleware.
 * Handles operational (AppError) and programming errors.
 */
const globalErrorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      err.statusCode >= 500
        ? { status: 'error', message: err.message }
        : {
            status: 'fail',
            data: { message: err.message, ...(err.errors && { errors: err.errors }) },
          }
    );
  }

  if (err.name === 'ValidationError') {
    error.statusCode = 422;
    error.message = messages.validation.failed;
    error.errors = Object.values(err.errors).map((e) => e.message);
  }

  if (err.code === 11000) {
    error.statusCode = 409;
    const kv = err.keyValue || {};
    if (Object.prototype.hasOwnProperty.call(kv, 'employeeId')) {
      error.message = messages.errors.employeeIdExists;
    } else if (Object.prototype.hasOwnProperty.call(kv, 'personalEmail')) {
      error.message = messages.errors.personalEmailExists;
    } else {
      error.message = messages.errors.referenceNumberExists;
    }
  }

  if (err.name === 'CastError') {
    error.statusCode = 400;
    error.message = messages.errors.invalidIdOrFormat;
  }

  const is4xx = error.statusCode >= 400 && error.statusCode < 500;
  const payload = is4xx
    ? {
        status: 'fail',
        data: { message: error.message, ...(error.errors && { errors: error.errors }) },
      }
    : { status: 'error', message: error.message || messages.errors.somethingWentWrong };

  if (process.env.NODE_ENV !== 'production' && !is4xx) {
    log.error(err);
    payload.stack = err.stack;
  } else if (!is4xx) {
    log.error(err);
  }

  res.status(error.statusCode).json(payload);
};

module.exports = globalErrorHandler;
