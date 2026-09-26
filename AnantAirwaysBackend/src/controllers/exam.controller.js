const crypto = require('crypto');
const ExamUser = require('../models/examUser.model');
const ExamQuestion = require('../models/examQuestion.model');
const { ValidationError, NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/apiResponse');
const { sendExamLinkEmail, sendSubmissionEmail, sendResultEmail } = require('../utils/email.service');

// ==========================================
// ADMIN CONTROLLERS - EXAM USERS
// ==========================================

/**
 * Add Exam User (Admin Only)
 * POST /api/v1/exam/users
 * Stores User Email, Phone Number, Name, generates 24h token, and sends Exam Link Email.
 */
const createExamUser = asyncHandler(async (req, res, next) => {
  const { email, phone, name } = req.body;

  if (!email || !phone || !name) {
    return next(new ValidationError('User Email, Phone Number, and Name are required'));
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone.trim();
  const cleanName = name.trim();

  // Check for duplicate email
  const existingUser = await ExamUser.findOne({ email: cleanEmail });
  if (existingUser) {
    return next(new AppError('An exam user with this email address already exists.', 409));
  }

  // Generate cryptographically secure random token & fresh 24h expiry from link generation time
  const token = crypto.randomBytes(32).toString('hex').toLowerCase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const examUser = await ExamUser.create({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    examToken: token,
    examTokenExpiresAt: expiresAt,
    examStatus: 'pending',
    emailSent: false
  });

  // Construct Exam URL
  const rawBaseUrl = process.env.FRONTEND_URL || 'https://anantairways.in';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const examUrl = `${baseUrl}/exam/${token}`;

  return sendResponse(res, 201, 'Exam user created successfully', {
    examUser,
    examUrl,
    token,
    expiresAt
  });
});

/**
 * Get All Exam Users (Admin Only)
 * GET /api/v1/exam/users
 */
const getExamUsers = asyncHandler(async (req, res, next) => {
  const examUsers = await ExamUser.find({}).sort({ createdAt: -1 });
  return sendResponse(res, 200, 'Exam users retrieved successfully', { examUsers });
});

/**
 * Get Single Exam User (Admin Only)
 * GET /api/v1/exam/users/:id
 */
const getSingleExamUser = asyncHandler(async (req, res, next) => {
  const examUser = await ExamUser.findById(req.params.id);
  if (!examUser) {
    return next(new NotFoundError('Exam user not found'));
  }
  return sendResponse(res, 200, 'Exam user retrieved successfully', { examUser });
});

/**
 * Delete Exam User (Admin Only)
 * DELETE /api/v1/exam/users/:id
 */
const deleteExamUser = asyncHandler(async (req, res, next) => {
  const examUser = await ExamUser.findByIdAndDelete(req.params.id);
  if (!examUser) {
    return next(new NotFoundError('Exam user not found'));
  }
  return sendResponse(res, 200, 'Exam user deleted successfully');
});

/**
 * Send Exam Link (Admin Only)
 * POST /api/v1/exam/users/:id/send-link
 * Reuses existing active valid token or generates fresh 24h token if expired/missing.
 */
const sendExamLink = asyncHandler(async (req, res, next) => {
  const examUser = await ExamUser.findById(req.params.id);
  if (!examUser) {
    return next(new NotFoundError('Exam user not found'));
  }

  if (examUser.examStatus === 'completed') {
    return next(new ValidationError('Cannot send exam link for an already completed exam.'));
  }

  let token = examUser.examToken ? examUser.examToken.trim().toLowerCase() : null;
  let expiresAt = examUser.examTokenExpiresAt;
  const nowMs = Date.now();
  const isTokenActive = token && expiresAt && new Date(expiresAt).getTime() > nowMs && examUser.examStatus === 'pending';

  if (!isTokenActive) {
    // Generate new secure random token & 24h expiry if token is missing or expired
    token = crypto.randomBytes(32).toString('hex').toLowerCase();
    expiresAt = new Date(nowMs + 24 * 60 * 60 * 1000);

    examUser.examToken = token;
    examUser.examTokenExpiresAt = expiresAt;
    examUser.examStatus = 'pending';
    await examUser.save();
  }

  // Construct Exam URL
  const rawBaseUrl = process.env.FRONTEND_URL || 'https://anantairways.in';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const examUrl = `${baseUrl}/exam/${token}`;
  const examName = 'Aviation Courses Examination';

  // Send Real Email via Brevo SMTP (safely handled so link state updates in DB regardless)
  let emailSentSuccessfully = false;
  try {
    const emailResult = await sendExamLinkEmail(
      examUser.email,
      examUser.name || examUser.email,
      examUrl,
      examName,
      expiresAt
    );
    if (emailResult && emailResult.success) {
      emailSentSuccessfully = true;
    }
  } catch (emailErr) {
    console.error('Failed to send exam link email:', emailErr.message);
  }

  if (emailSentSuccessfully) {
    examUser.emailSent = true;
    await examUser.save();
  }

  return sendResponse(res, 200, 'Exam link sent successfully', {
    examUser,
    examUrl,
    token,
    expiresAt
  });
});

/**
 * Get Exam Results (Admin Only)
 * GET /api/v1/exam/results
 */
const getExamResults = asyncHandler(async (req, res, next) => {
  const results = await ExamUser.find({ examStatus: 'completed' }).sort({ submittedAt: -1 });
  return sendResponse(res, 200, 'Exam results retrieved successfully', { results });
});

/**
 * Send Result Email (Admin Only)
 * POST /api/v1/exam/results/:id/send-result
 */
const sendResultEmailToCandidate = asyncHandler(async (req, res, next) => {
  const examUser = await ExamUser.findById(req.params.id);
  if (!examUser) {
    return next(new NotFoundError('Exam user not found'));
  }

  if (examUser.examStatus !== 'completed') {
    return next(new ValidationError('Cannot send result for an uncompleted exam.'));
  }

  const examName = 'Aviation Courses Examination';
  await sendResultEmail(
    examUser.email,
    examUser.name || examUser.email,
    examName,
    examUser.score,
    examUser.totalMarks
  );

  examUser.resultSent = true;
  await examUser.save();

  return sendResponse(res, 200, 'Exam result email sent successfully', { examUser });
});


// ==========================================
// ADMIN CONTROLLERS - QUESTION MANAGEMENT
// ==========================================

/**
 * Create Question (Admin Only)
 * POST /api/v1/exam/questions
 */
const createQuestion = asyncHandler(async (req, res, next) => {
  const { question, options, correctAnswer, marks, type } = req.body;

  if (!question || !question.trim()) {
    return next(new ValidationError('Question statement is required'));
  }

  const currentCount = await ExamQuestion.countDocuments();
  if (currentCount >= 25) {
    return next(new AppError('Maximum limit of 25 questions per exam reached (5 Written + 20 MCQ).', 400));
  }

  const nextPos = currentCount + 1;
  const isWritten = nextPos <= 5;
  const questionType = isWritten ? 'written' : 'mcq';

  if (!isWritten) {
    if (!options || !Array.isArray(options) || options.filter((o) => o.trim() !== '').length < 2 || !correctAnswer) {
      return next(new ValidationError('MCQ questions require at least 2 options and a correct answer'));
    }
  }

  const newQuestion = await ExamQuestion.create({
    question: question.trim(),
    type: questionType,
    options: isWritten ? [] : options.filter((o) => o.trim() !== '').map((opt) => opt.trim()),
    correctAnswer: isWritten ? '' : correctAnswer.trim(),
    marks: marks ? Number(marks) : 1
  });

  return sendResponse(res, 201, 'Question created successfully', { question: newQuestion });
});

/**
 * Get All Questions (Admin Only - includes correctAnswer)
 * GET /api/v1/exam/questions
 */
const getQuestions = asyncHandler(async (req, res, next) => {
  const questions = await ExamQuestion.find({}).sort({ createdAt: 1 });
  return sendResponse(res, 200, 'Questions retrieved successfully', { questions });
});

/**
 * Update Question (Admin Only)
 * PUT /api/v1/exam/questions/:id
 */
const updateQuestion = asyncHandler(async (req, res, next) => {
  const { question, options, correctAnswer, marks, type } = req.body;
  const targetQuestion = await ExamQuestion.findById(req.params.id);

  if (!targetQuestion) {
    return next(new NotFoundError('Question not found'));
  }

  if (question !== undefined && question.trim()) targetQuestion.question = question.trim();
  if (marks !== undefined) targetQuestion.marks = Number(marks);

  const qType = type || targetQuestion.type || (targetQuestion.options && targetQuestion.options.length > 0 ? 'mcq' : 'written');
  targetQuestion.type = qType;

  if (qType === 'mcq') {
    if (options !== undefined && Array.isArray(options) && options.filter((o) => o.trim() !== '').length >= 2) {
      targetQuestion.options = options.filter((o) => o.trim() !== '').map((opt) => opt.trim());
    }
    if (correctAnswer !== undefined) targetQuestion.correctAnswer = correctAnswer.trim();
  } else {
    targetQuestion.options = [];
    targetQuestion.correctAnswer = '';
  }

  await targetQuestion.save();
  return sendResponse(res, 200, 'Question updated successfully', { question: targetQuestion });
});

/**
 * Delete Question (Admin Only)
 * DELETE /api/v1/exam/questions/:id
 */
const deleteQuestion = asyncHandler(async (req, res, next) => {
  const targetQuestion = await ExamQuestion.findByIdAndDelete(req.params.id);
  if (!targetQuestion) {
    return next(new NotFoundError('Question not found'));
  }
  return sendResponse(res, 200, 'Question deleted successfully');
});


// ==========================================
// USER CONTROLLERS - CANDIDATE EXAM FLOW
// ==========================================

/**
 * Check Exam Token Status (User Public Endpoint)
 * GET /api/v1/exam/:token
 * Validates token existence, 24-hour expiry, completion status.
 */
const checkExamToken = asyncHandler(async (req, res, next) => {
  const cleanToken = req.params.token ? req.params.token.trim().toLowerCase() : '';

  if (!cleanToken) {
    console.warn('⚠️ [CHECK EXAM TOKEN FAILED] Empty token string provided');
    return next(new NotFoundError('Invalid exam link'));
  }

  const examUser = await ExamUser.findOne({ examToken: cleanToken });

  if (!examUser) {
    console.warn(`⚠️ [CHECK EXAM TOKEN FAILED] No user document found matching token: "${cleanToken}"`);
    return next(new NotFoundError('Invalid exam link'));
  }

  // 24-hour expiry check
  const nowMs = Date.now();
  const expiresAtMs = examUser.examTokenExpiresAt ? new Date(examUser.examTokenExpiresAt).getTime() : 0;

  if (expiresAtMs > 0 && nowMs > expiresAtMs) {
    console.warn(`⚠️ [CHECK EXAM TOKEN EXPIRED] User: ${examUser.email}, ExpiresAt: ${examUser.examTokenExpiresAt}, Current: ${new Date()}`);
    if (examUser.examStatus !== 'completed') {
      examUser.examStatus = 'expired';
      await examUser.save();
    }
    return next(new AppError('Exam link has expired', 400));
  }

  if (examUser.examStatus === 'expired') {
    console.warn(`⚠️ [CHECK EXAM TOKEN EXPIRED STATUS] User: ${examUser.email}`);
    return next(new AppError('Exam link has expired', 400));
  }

  if (examUser.examStatus === 'completed') {
    console.log(`ℹ️ [CHECK EXAM TOKEN ALREADY COMPLETED] User: ${examUser.email}`);
    return next(new AppError('This exam has already been submitted.', 400));
  }

  console.log(`✅ [CHECK EXAM TOKEN SUCCESS] Valid active token for user: ${examUser.email}`);
  return sendResponse(res, 200, 'Exam link is valid', {
    valid: true
  });
});

/**
 * Start Exam / Candidate Login (User Public Endpoint)
 * POST /api/v1/exam/:token/start (also /verify)
 * User submits { email, phone, name }.
 * Step 1: Find user using exam token.
 * Step 2: Check user exists.
 * Step 3: Check token expiry.
 * Step 4: Check exam status.
 * Step 5: Check email and name match stored details.
 * Step 6: Return questions WITHOUT correctAnswer immediately.
 */
const startExam = asyncHandler(async (req, res, next) => {
  const cleanToken = req.params.token ? req.params.token.trim().toLowerCase() : '';
  const { email, phone, name } = req.body;

  if (!cleanToken) {
    console.warn('⚠️ [START EXAM FAILED] Empty token string provided');
    return next(new NotFoundError('Invalid exam link'));
  }

  if (!email || !name) {
    return next(new ValidationError('Email and Name are required to start the exam.'));
  }

  // Step 1 & 2: Find user using token
  const examUser = await ExamUser.findOne({ examToken: cleanToken });
  if (!examUser) {
    console.warn(`⚠️ [START EXAM FAILED] No user document found matching token: "${cleanToken}"`);
    return next(new NotFoundError('Invalid exam link'));
  }

  // Step 3: Check 24-hour token expiry
  const nowMs = Date.now();
  const expiresAtMs = examUser.examTokenExpiresAt ? new Date(examUser.examTokenExpiresAt).getTime() : 0;

  if (expiresAtMs > 0 && nowMs > expiresAtMs) {
    console.warn(`⚠️ [START EXAM EXPIRED] User: ${examUser.email}, ExpiresAt: ${examUser.examTokenExpiresAt}, Current: ${new Date()}`);
    if (examUser.examStatus !== 'completed') {
      examUser.examStatus = 'expired';
      await examUser.save();
    }
    return next(new AppError('Exam link has expired', 400));
  }

  if (examUser.examStatus === 'expired') {
    return next(new AppError('Exam link has expired', 400));
  }

  // Step 4: Check exam status
  if (examUser.examStatus === 'completed') {
    return next(new AppError('This exam has already been submitted.', 400));
  }

  // Step 5: Check email and name match stored details
  const isEmailMatch = examUser.email.toLowerCase().trim() === email.toLowerCase().trim();
  const isNameMatch = examUser.name.toLowerCase().trim().replace(/\s+/g, ' ') === name.toLowerCase().trim().replace(/\s+/g, ' ');

  if (!isEmailMatch || !isNameMatch) {
    return next(new AppError('User details do not match the exam invitation.', 400));
  }

  // Step 6: Immediately return questions WITHOUT correctAnswer immediately
  const allQuestions = await ExamQuestion.find({}).sort({ createdAt: 1 });
  const sanitizedQuestions = allQuestions.map((q) => ({
    _id: q._id,
    question: q.question,
    type: q.type || (q.options && q.options.length > 0 ? 'mcq' : 'written'),
    options: q.options,
    marks: q.marks
  }));

  console.log(`✅ [START EXAM SUCCESS] User ${examUser.email} logged in. Exam started.`);
  return sendResponse(res, 200, 'Login successful. Starting exam...', {
    user: {
      name: examUser.name,
      email: examUser.email,
      phone: examUser.phone
    },
    questions: sanitizedQuestions
  });
});

/**
 * Submit Exam (User Public Endpoint)
 * POST /api/v1/exam/:token/submit
 * Validates token, 24h expiry, user details match.
 * Evaluates score server-side, saves results, invalidates token (examToken = null), and sends confirmation email.
 */
const submitExam = asyncHandler(async (req, res, next) => {
  const cleanToken = req.params.token ? req.params.token.trim().toLowerCase() : '';
  const { email, phone, name, answers } = req.body;

  if (!cleanToken) {
    console.warn('⚠️ [SUBMIT EXAM FAILED] Empty token string provided');
    return next(new NotFoundError('Invalid exam link'));
  }

  if (!answers || !Array.isArray(answers)) {
    return next(new ValidationError('Submitted answers are required.'));
  }

  const examUser = await ExamUser.findOne({ examToken: cleanToken });
  if (!examUser) {
    console.warn(`⚠️ [SUBMIT EXAM FAILED] No user document found matching token: "${cleanToken}"`);
    return next(new NotFoundError('Invalid exam link'));
  }

  // Check 24-hour expiry
  const nowMs = Date.now();
  const expiresAtMs = examUser.examTokenExpiresAt ? new Date(examUser.examTokenExpiresAt).getTime() : 0;

  if (expiresAtMs > 0 && nowMs > expiresAtMs) {
    console.warn(`⚠️ [SUBMIT EXAM EXPIRED] User: ${examUser.email}, ExpiresAt: ${examUser.examTokenExpiresAt}, Current: ${new Date()}`);
    if (examUser.examStatus !== 'completed') {
      examUser.examStatus = 'expired';
      await examUser.save();
    }
    return next(new AppError('Exam link has expired', 400));
  }

  if (examUser.examStatus === 'expired') {
    return next(new AppError('Exam link has expired', 400));
  }

  if (examUser.examStatus === 'completed') {
    return next(new AppError('This exam has already been submitted.', 400));
  }

  // Verify details match
  if (email && name) {
    const isEmailMatch = examUser.email.toLowerCase().trim() === email.toLowerCase().trim();
    const isNameMatch = examUser.name.toLowerCase().trim().replace(/\s+/g, ' ') === name.toLowerCase().trim().replace(/\s+/g, ' ');

    if (!isEmailMatch || !isNameMatch) {
      return next(new AppError('User details do not match the exam invitation.', 400));
    }
  }

  // Server-side score calculation
  let score = 0;
  let totalMarks = 0;
  const allQuestions = await ExamQuestion.find({});

  for (const q of allQuestions) {
    totalMarks += (q.marks || 1);
    const submittedObj = answers.find((ans) => ans.questionId && ans.questionId.toString() === q._id.toString());
    const submittedAnswer = submittedObj ? (submittedObj.answer || submittedObj.selectedAnswer || '') : '';

    if (submittedAnswer && submittedAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
      score += (q.marks || 1);
    }
  }

  // Save exam results
  examUser.score = score;
  examUser.totalMarks = totalMarks;
  examUser.submittedAt = new Date();
  examUser.examStatus = 'completed';
  await examUser.save();

  // Send real examination result email after calculating result
  await sendResultEmail(
    examUser.email,
    examUser.name || examUser.email,
    'Aviation Courses Examination',
    score,
    totalMarks
  );

  return sendResponse(res, 200, 'Exam submitted successfully', {
    score,
    totalMarks,
    submittedAt: examUser.submittedAt
  });
});

module.exports = {
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
};
