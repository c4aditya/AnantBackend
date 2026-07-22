const express = require('express');
const router = express.Router();
const {
  createAdmin,
  addUser,
  loginUser,
  loginAdmin,
  logout,
  getCurrentUser,
  getAllUsers,
  deleteUser,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// Public Setup Routes
router.post('/create-admin', createAdmin);
router.post('/login-user', loginUser);
router.post('/login-admin', loginAdmin);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Routes (General User & Admin)
router.get('/me', protect, getCurrentUser);

// Admin-Only Routes
router.post('/add-user', protect, authorizeRoles('admin'), addUser);
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser);
router.delete('/user/:id', protect, authorizeRoles('admin'), deleteUser);

module.exports = router;
