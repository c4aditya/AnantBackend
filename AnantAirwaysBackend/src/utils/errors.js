/**
 * Base App Error Class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (HTTP 400)
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message || 'Validation failed. Please verify input fields.', 400);
  }
}

/**
 * Unauthorized Access Error (HTTP 401)
 */
class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'Unauthorized access. Authentication is required.', 401);
  }
}

/**
 * Forbidden Access Error (HTTP 403)
 */
class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'Forbidden. You do not have permission to perform this action.', 403);
  }
}

/**
 * Not Found Error (HTTP 404)
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message || 'Resource not found.', 404);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
};
