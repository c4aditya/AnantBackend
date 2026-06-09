const { AppError } = require('../utils/errors');

/**
 * Handle Mongoose CastError (e.g. invalid Object ID)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Errors (11000)
 */
const handleDuplicateFieldsDB = (err) => {
  // Extract the duplicate field and value from the error message
  const keys = Object.keys(err.keyValue || {});
  const fieldName = keys.length > 0 ? keys[0] : 'field';
  const val = err.keyValue ? err.keyValue[fieldName] : '';

  let message = `Duplicate field value: "${val}". Please use another value!`;

  if (fieldName === 'anantEmail') {
    message = 'Anant Email details match an existing record. Please use a unique Anant Email.';
  } else if (fieldName === 'userEmail') {
    message = 'Personal Email details match an existing record. Please use a unique personal email.';
  } else if (fieldName === 'userPhoneNumber') {
    message = 'Personal Phone Number details match an existing record. Please use a unique phone number.';
  }

  return new AppError(message, 409); // 409 Conflict
};

/**
 * Handle Mongoose Validation Errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Invalid Signature
 */
const handleJWTError = () => {
  return new AppError('Invalid authentication token. Please login again.', 401);
};

/**
 * Handle JWT Token Expired
 */
const handleJWTExpiredError = () => {
  return new AppError('Authentication token has expired. Please login again.', 401);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Send full error details in development
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Production Error Handling
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  if (error.name === 'CastError') {
    error = handleCastErrorDB(error);
  }
  if (error.code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }
  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }
  if (error.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Operational, trusted error: send message to client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.message
    });
  }

  // Programming or other unknown error: don't leak details to client
  console.error('ERROR 💥:', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong on the server.'
  });
};

module.exports = errorHandler;
