/**
 * Wrapper for async route handlers to catch unresolved promises and forward them to the next middleware
 * @param {Function} fn - Async controller function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
