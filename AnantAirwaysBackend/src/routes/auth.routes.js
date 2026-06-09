const express = require('express');
const router = express.Router();
const {
  createAdmin,
  addUser,
  loginUser,
  loginAdmin,
  logout,
  getCurrentUser,
  getAllUsers
} = require('../controllers/auth.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// Public Setup Routes
router.post('/create-admin', createAdmin);
router.post('/login-user', loginUser);
router.post('/login-admin', loginAdmin);
router.post('/logout', logout);

// Protected Routes (General User & Admin)
router.get('/me', protect, getCurrentUser);

// Admin-Only Routes
router.post('/add-user', protect, authorizeRoles('admin'), addUser);
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);

module.exports = router;
