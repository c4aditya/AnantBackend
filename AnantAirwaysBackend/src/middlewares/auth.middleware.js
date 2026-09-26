const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect middleware: Ensures the user is authenticated via JWT cookie
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token && req.cookies.token !== 'none') {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Please log in to access this resource.'));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretjwtkeyforanantairwaysexaminationbackend123456!'
    );

    const currentUser = await User.findById(decoded.id);
    if (!currentUser || !currentUser.isActive) {
      return next(new UnauthorizedError('User account invalid or deactivated.'));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired authentication token.'));
  }
});

/**
 * Simple Admin role-based access middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Access forbidden: insufficient permissions.'));
    }
    next();
  };
};

module.exports = {
  protect,
  requireAdmin,
  authorizeRoles
};
