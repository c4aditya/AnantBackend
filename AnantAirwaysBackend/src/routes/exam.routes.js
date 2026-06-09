const express = require('express');
const router = express.Router();
const {
  createExam,
  getAllExams,
  getSingleExam,
  updateExam,
  deleteExam,
  publishExam,
  submitExam
} = require('../controllers/exam.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// All exam routes require authentication
router.use(protect);

// User and Admin shared/conditional routes
router.get('/', getAllExams); // Lists all for Admin, published-only for User
router.get('/:id', getSingleExam); // Retrieves full for Admin, published-only stripped for User
router.post('/submit', authorizeRoles('user', 'admin'), submitExam); // User takes/submits exam

// Admin Only Routes
router.post('/', authorizeRoles('admin'), createExam);
router.put('/:id', authorizeRoles('admin'), updateExam);
router.delete('/:id', authorizeRoles('admin'), deleteExam);
router.patch('/:id/publish', authorizeRoles('admin'), publishExam);

module.exports = router;
