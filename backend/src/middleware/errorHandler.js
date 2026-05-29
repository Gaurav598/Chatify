import logger from "../config/logger.js";
import { AppError } from "../utils/errors.js";
import config from "../config/index.js";
import mongoose from "mongoose";

/**
 * Global error handler middleware.
 * Must be registered LAST in Express middleware chain.
 */
export const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errorCode = err.errorCode || "INTERNAL_ERROR";
  let errors = err.errors || undefined;

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = "DUPLICATE_KEY";
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Token has expired";
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${errorCode}: ${message}`, {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id,
    });
  } else {
    logger.warn(`${errorCode}: ${message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  // Send response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(errors && { details: errors }),
      ...(config.isDev && statusCode >= 500 && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
