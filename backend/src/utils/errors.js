/**
 * Custom application error class with HTTP status codes and error codes.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", errorCode = "BAD_REQUEST") {
    super(message, 400, errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", errorCode = "UNAUTHORIZED") {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", errorCode = "FORBIDDEN") {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", errorCode = "NOT_FOUND") {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", errorCode = "CONFLICT") {
    super(message, 409, errorCode);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", errorCode = "RATE_LIMIT_EXCEEDED") {
    super(message, 429, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(errors = [], message = "Validation failed") {
    super(message, 422, "VALIDATION_ERROR");
    this.errors = errors;
  }
}
