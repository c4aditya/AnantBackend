/**
 * Send standard success JSON response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Response message
 * @param {Object|Array} data - Payload data
 */
const sendResponse = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

module.exports = {
  sendResponse
};
