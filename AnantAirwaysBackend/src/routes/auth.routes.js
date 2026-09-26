const express = require('express');
const router = express.Router();
const {
  createAdmin,
  loginAdmin,
  getMe,
  logout
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// Public Admin Auth Routes
router.post('/create-admin', createAdmin);
router.post('/login-admin', loginAdmin);
router.post('/logout', logout);

// Protected Auth Routes
router.get('/me', protect, getMe);

module.exports = router;
