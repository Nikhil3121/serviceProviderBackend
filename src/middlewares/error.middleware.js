// src/middlewares/error.middleware.js
const mongoose = require('mongoose');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 404 Not Found handler — use after all routes
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central error handler
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // ── Mongoose: CastError (invalid ObjectId) ─────────────────────────────
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // ── Mongoose: Duplicate key ────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    error = ApiError.conflict(`${field} '${value}' is already in use`);
  }

  // ── Mongoose: ValidationError ──────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', errors);
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired. Please log in again.');
  }

  // ── Multer: File too large ─────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File too large. Maximum size is 5MB.');
  }

  // ── Normalize to ApiError ──────────────────────────────────────────────
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message =
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : error.message || 'Something went wrong';
    error = new ApiError(statusCode, message, error.errors || []);
  }

  // ── Logging ────────────────────────────────────────────────────────────
  const logMeta = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id,
    statusCode: error.statusCode,
  };

  if (error.statusCode >= 500) {
    logger.error(error.message, { ...logMeta, stack: err.stack });
  } else if (error.statusCode >= 400) {
    logger.warn(error.message, logMeta);
  }

  // ── Response ───────────────────────────────────────────────────────────
  const response = {
    success: false,
    message: error.message,
    ...(error.errors?.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(error.statusCode).json(response);
};

module.exports = { notFound, errorHandler };
