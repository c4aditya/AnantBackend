const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect middleware: Ensures the user is authenticated via cookie JWT
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Retrieve token from request cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return next(new UnauthorizedError('Please log in to access this resource.'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforanantairwaysexaminationbackend123456!');

    // Find the user associated with the token
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    if (!currentUser.isActive) {
      return next(new UnauthorizedError('Your account has been deactivated. Please contact support.'));
    }

    // Attach user to the request object
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired token. Please log in again.'));
  }
});

/**
 * Role authorization middleware: Ensures current user has one of the required roles
 * @param {...String} roles - Array of permitted roles (e.g. 'admin', 'user')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this resource.`
        )
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles
};
