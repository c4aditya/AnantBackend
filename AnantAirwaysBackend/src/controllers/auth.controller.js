const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { ValidationError, UnauthorizedError, AppError, NotFoundError } = require('../utils/errors');
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
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day expiration
  };

  res.cookie('token', token, cookieOptions);

  // Return clean user object without password
  const userResponse = {
    _id: user._id,
    anantEmail: user.anantEmail,
    userEmail: user.userEmail,
    userPhoneNumber: user.userPhoneNumber,
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
 * Create Admin (Role automatically becomes "admin")
 * Public or admin setup endpoint
 */
const createAdmin = asyncHandler(async (req, res, next) => {
  const { anantEmail, password , userPhoneNumber} = req.body;

  if (!anantEmail || !password ) {
    return next(new ValidationError('All fields (anantEmail, password, userEmail, userPhoneNumber) are required'));
  }

  // Create admin user
  const admin = await User.create({
    anantEmail,
    password,  
    userPhoneNumber, 
    role: 'admin'
  });

  return sendTokenResponse(admin, 201, 'Admin created successfully', res);
});

/**
 * Add User (Admin only)
 */
const addUser = asyncHandler(async (req, res, next) => {
  const {anantEmail,  userEmail, password, userPhoneNumber } = req.body;

  if (!anantEmail || !userEmail  || !password ||  !userPhoneNumber) {
    return next(new ValidationError('All fields (anantEmail, password,  userPhoneNumber) are required'));
  }

  if(anantEmail !== userEmail){

    return res.status(400).json({
      success: false,
      message: 'Both emails must be the same. Please provide the same email for both anantEmail and userEmail.'
    });
  }

  // Create standard user
  const user = await User.create({
    anantEmail,
    userEmail,
    password,    
    userPhoneNumber,
    role: 'user'
  });

  // Exclude password from return payload
  const responseData = {
    _id: user._id, 
    anantEmail: user.anantEmail,
    userEmail: user.userEmail,   
    userPhoneNumber: user.userPhoneNumber,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };

  return sendResponse(res, 201, 'User added successfully', { user: responseData });
});

/**
 * User Login
 */
const loginUser = asyncHandler(async (req, res, next) => {
  const { anantEmail, password,  userPhoneNumber } = req.body;

  // Validate inputs
  if (!anantEmail || !password ||  !userPhoneNumber) {
    return next(new ValidationError('All login fields are required'));
  }

  // Check user exists matching all three fields
  const user = await User.findOne({
    anantEmail,
    
    userPhoneNumber
  }).select('+password');

  if (!user) {
    return next(new ValidationError('User details do not match records.'));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new UnauthorizedError('Your account has been deactivated.'));
  }

  // Verify role is "user" to prevent admin logging in via user login if desired (or allow both, but usually roles are strict)
  if (user.role !== 'user') {
    return next(new ValidationError('User details do not match records.'));
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ValidationError('User details do not match records.'));
  }

  return sendTokenResponse(user, 200, 'User logged in successfully', res);
});

/**
 * Admin Login
 */
const loginAdmin = asyncHandler(async (req, res, next) => {
  const { anantEmail, password,  userPhoneNumber } = req.body;

  // Validate inputs
  if (!anantEmail || !password  || !userPhoneNumber) {
    return next(new ValidationError('All login fields are required'));
  }

  // Check user exists matching all fields and verify role is 'admin'
  const admin = await User.findOne({
    anantEmail,    
    userPhoneNumber,
    role: 'admin'
  }).select('+password');

  if (!admin) {
    return next(new ValidationError('User details do not match records.'));
  }

  if (!admin.isActive) {
    return next(new UnauthorizedError('Your admin account has been deactivated.'));
  }

  // Compare passwords
  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return next(new ValidationError('User details do not match records.'));
  }

  return sendTokenResponse(admin, 200, 'Admin logged in successfully', res);
});

/**
 * Logout User / Admin
 */
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), // expires in 10 seconds
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });

  return sendResponse(res, 200, 'Logged out successfully');
});

/**
 * Get Current Logged-in User
 */
const getCurrentUser = asyncHandler(async (req, res, next) => {
  // Return req.user attached by protect middleware
  const user = {
    _id: req.user._id,
    anantEmail: req.user.anantEmail,
    
    userPhoneNumber: req.user.userPhoneNumber,
    role: req.user.role,
    isActive: req.user.isActive,
    createdAt: req.user.createdAt
  };

  return sendResponse(res, 200, 'Current user profile retrieved successfully', { user });
});

/**
 * Get All Users (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({}).select('-password');
  return sendResponse(res, 200, 'Users retrieved successfully', { users });
});

/**
 * Delete User (Admin only)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new NotFoundError('User not found'));
  }

  return sendResponse(res, 200, 'User deleted successfully');
});

module.exports = {
  createAdmin,
  addUser,
  loginUser,
  loginAdmin,
  logout,
  getCurrentUser,
  getAllUsers,
  deleteUser
};
