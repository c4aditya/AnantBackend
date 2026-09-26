const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { ValidationError, UnauthorizedError, AppError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Helper to generate JWT token and send in secure HTTP-only cookie
 */
const sendTokenResponse = (user, statusCode, message, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'supersecretjwtkeyforanantairwaysexaminationbackend123456!',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  res.cookie('token', token, cookieOptions);

  const userResponse = {
    _id: user._id,
    adminEmail: user.adminEmail || user.email,
    email: user.email || user.adminEmail,
    anantEmail: user.email || user.adminEmail,
    role: user.role,
    isActive: user.isActive
  };

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user: userResponse }
  });
};

/**
 * 1. Create Admin
 * POST /api/v1/auth/create-admin
 * Accepts ONLY: adminEmail, adminPassword (or email, password)
 */
const createAdmin = asyncHandler(async (req, res, next) => {
  const adminEmail = req.body.adminEmail || req.body.email || req.body.anantEmail;
  const adminPassword = req.body.adminPassword || req.body.password;

  if (!adminEmail || !adminPassword) {
    return next(new ValidationError('adminEmail and adminPassword are required'));
  }

  const existingAdmin = await User.findOne({
    $or: [
      { adminEmail: adminEmail.toLowerCase().trim() },
      { email: adminEmail.toLowerCase().trim() }
    ]
  });

  if (existingAdmin) {
    return next(new AppError('An admin account with this email already exists.', 409));
  }

  const admin = await User.create({
    adminEmail: adminEmail.toLowerCase().trim(),
    adminPassword,
    role: 'admin'
  });

  return sendTokenResponse(admin, 201, 'Admin created successfully', res);
});

/**
 * 2. Login Admin
 * POST /api/v1/auth/login-admin
 * Accepts ONLY: adminEmail, adminPassword (or email, password)
 */
const loginAdmin = asyncHandler(async (req, res, next) => {
  const adminEmail = req.body.adminEmail || req.body.email || req.body.anantEmail;
  const adminPassword = req.body.adminPassword || req.body.password;

  if (!adminEmail || !adminPassword) {
    return next(new ValidationError('adminEmail and adminPassword are required'));
  }

  const admin = await User.findOne({
    $or: [
      { adminEmail: adminEmail.toLowerCase().trim() },
      { email: adminEmail.toLowerCase().trim() }
    ]
  }).select('+adminPassword +password');

  if (!admin || admin.role !== 'admin') {
    return next(new UnauthorizedError('Invalid admin credentials'));
  }

  const isMatch = await admin.comparePassword(adminPassword);
  if (!isMatch) {
    return next(new UnauthorizedError('Invalid admin credentials'));
  }

  if (!admin.isActive) {
    return next(new UnauthorizedError('Your account has been deactivated'));
  }

  return sendTokenResponse(admin, 200, 'Admin logged in successfully', res);
});

/**
 * Get Current User Profile
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res, next) => {
  const userResponse = {
    _id: req.user._id,
    adminEmail: req.user.adminEmail || req.user.email,
    email: req.user.email || req.user.adminEmail,
    anantEmail: req.user.email || req.user.adminEmail,
    role: req.user.role,
    isActive: req.user.isActive
  };

  return sendResponse(res, 200, 'User profile retrieved successfully', { user: userResponse });
});

/**
 * Logout User / Admin
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  return sendResponse(res, 200, 'Logged out successfully');
});

module.exports = {
  createAdmin,
  loginAdmin,
  getMe,
  logout
};
