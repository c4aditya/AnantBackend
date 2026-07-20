const express = require('express');
const router = express.Router();
const {
  createExam,
  getAllExams,
  getSingleExam,
  updateExam,
  deleteExam,
  publishExam,
  submitExam,
  getAllSubmissions,
  deleteSubmission,
  getCompletedExams
} = require('../controllers/exam.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// All exam routes require authentication
router.use(protect);

// Static / Fixed routes (MUST be defined before dynamic :id parameter routes)
router.get('/', getAllExams); // Lists all for Admin, published-only for User
router.get('/completed', getCompletedExams);
router.get('/submissions', authorizeRoles('admin'), getAllSubmissions);
router.post('/submit', authorizeRoles('user', 'admin'), submitExam); // User takes/submits exam
router.post('/', authorizeRoles('admin'), createExam);

// Specific nested parameter routes
router.delete('/submissions/:id', authorizeRoles('admin'), deleteSubmission);

// Dynamic Parameterized routes (MUST come after all fixed paths to prevent collision)
router.get('/:id', getSingleExam); // Retrieves full for Admin, published-only stripped for User
router.put('/:id', authorizeRoles('admin'), updateExam);
router.delete('/:id', authorizeRoles('admin'), deleteExam);
router.patch('/:id/publish', authorizeRoles('admin'), publishExam);

module.exports = router;
