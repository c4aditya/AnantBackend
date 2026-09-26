const express = require('express');
const router = express.Router();
const {
  // Admin Candidate Controllers
  createExamUser,
  getExamUsers,
  getSingleExamUser,
  deleteExamUser,
  sendExamLink,
  getExamResults,
  sendResultEmailToCandidate,

  // Admin Question Controllers
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,

  // User Candidate Controllers
  checkExamToken,
  startExam,
  submitExam
} = require('../controllers/exam.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// ==========================================
// ADMIN ROUTES (Requires Admin Auth Cookie)
// ==========================================
router.post('/users', protect, authorizeRoles('admin'), createExamUser);
router.get('/users', protect, authorizeRoles('admin'), getExamUsers);
router.get('/users/:id', protect, authorizeRoles('admin'), getSingleExamUser);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteExamUser);
router.post('/users/:id/send-link', protect, authorizeRoles('admin'), sendExamLink);

router.get('/results', protect, authorizeRoles('admin'), getExamResults);
router.post('/results/:id/send-result', protect, authorizeRoles('admin'), sendResultEmailToCandidate);

router.post('/questions', protect, authorizeRoles('admin'), createQuestion);
router.get('/questions', protect, authorizeRoles('admin'), getQuestions);
router.put('/questions/:id', protect, authorizeRoles('admin'), updateQuestion);
router.delete('/questions/:id', protect, authorizeRoles('admin'), deleteQuestion);

// ==========================================
// USER ROUTES (Token Based Public Verification & Exam)
// ==========================================
router.get('/:token', checkExamToken);
router.post('/:token/start', startExam);
router.post('/:token/verify', startExam); // Alias for startExam
router.post('/:token/submit', submitExam);

module.exports = router;
