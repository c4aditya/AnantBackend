const mongoose = require('mongoose');
const Exam = require('../models/exam.model');
const Result = require('../models/result.model');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Create Exam (Admin Only)
 */
const createExam = asyncHandler(async (req, res, next) => {
  const { title, description, durationInMinutes, questions } = req.body;

  if (!title || !durationInMinutes || !questions || !Array.isArray(questions) || questions.length === 0) {
    return next(new ValidationError('Title, durationInMinutes, and a non-empty questions array are required'));
  }

  // Create Exam (pre-save hook will compute totalMarks)
  const exam = new Exam({
    title,
    description,
    durationInMinutes,
    questions,
    createdBy: req.user._id
  });

  await exam.save();

  // Populate creator info
  await exam.populate('createdBy', 'anantEmail userEmail');

  return sendResponse(res, 201, 'Exam created successfully', { exam });
});

/**
 * Get All Exams
 * Admin gets all exams.
 * Users get only published exams.
 */
const getAllExams = asyncHandler(async (req, res, next) => {
  let query = {};

  // If role is user, only fetch published exams
  if (req.user.role === 'user') {
    query.isPublished = true;
  }

  // Fetch and populate creator info
  const exams = await Exam.find(query)
    .populate('createdBy', 'anantEmail userEmail')
    .sort({ createdAt: -1 });

  // If user is a student/user, strip out correct answers from all exams and questions to prevent cheating
  if (req.user.role === 'user') {
    const sanitizedExams = exams.map((exam) => {
      const sanitized = exam.toObject();
      sanitized.questions = sanitized.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
      return sanitized;
    });

    return sendResponse(res, 200, 'Published exams retrieved successfully', { exams: sanitizedExams });
  }

  return sendResponse(res, 200, 'All exams retrieved successfully', { exams });
});

/**
 * Get Single Exam
 * Admin gets all info.
 * Users get details only if published, and correctAnswers are stripped.
 */
const getSingleExam = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new NotFoundError('Exam not found'));
  }

  const exam = await Exam.findById(req.params.id).populate('createdBy', 'anantEmail userEmail');

  if (!exam) {
    return next(new NotFoundError('Exam not found'));
  }

  // If user role is 'user', check if published and strip correct answers
  if (req.user.role === 'user') {
    if (!exam.isPublished) {
      return next(new ForbiddenError('You do not have access to this unpublished exam'));
    }

    const sanitizedExam = exam.toObject();
    sanitizedExam.questions = sanitizedExam.questions.map((q) => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });

    return sendResponse(res, 200, 'Exam retrieved successfully', { exam: sanitizedExam });
  }

  return sendResponse(res, 200, 'Exam retrieved successfully', { exam });
});

/**
 * Update Exam (Admin Only)
 */
const updateExam = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new NotFoundError('Exam not found'));
  }

  const { title, description, durationInMinutes, questions, isPublished } = req.body;

  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return next(new NotFoundError('Exam not found'));
  }

  // Update properties if provided
  if (title !== undefined) exam.title = title;
  if (description !== undefined) exam.description = description;
  if (durationInMinutes !== undefined) exam.durationInMinutes = durationInMinutes;
  if (questions !== undefined) exam.questions = questions;
  if (isPublished !== undefined) exam.isPublished = isPublished;

  // Save the exam to trigger the pre-save Hook (recalculating totalMarks)
  await exam.save();
  await exam.populate('createdBy', 'anantEmail userEmail');

  return sendResponse(res, 200, 'Exam updated successfully', { exam });
});

/**
 * Delete Exam (Admin Only)
 */
const deleteExam = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new NotFoundError('Exam not found'));
  }

  const exam = await Exam.findByIdAndDelete(req.params.id);

  if (!exam) {
    return next(new NotFoundError('Exam not found'));
  }

  return sendResponse(res, 200, 'Exam deleted successfully');
});

/**
 * Publish Exam (Admin Only)
 */
const publishExam = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new NotFoundError('Exam not found'));
  }

  const { isPublished } = req.body;

  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return next(new NotFoundError('Exam not found'));
  }

  // Set the publication status (default to true if not specified)
  exam.isPublished = isPublished !== undefined ? isPublished : true;

  await exam.save();
  await exam.populate('createdBy', 'anantEmail userEmail');

  const statusText = exam.isPublished ? 'published' : 'unpublished';
  return sendResponse(res, 200, `Exam ${statusText} successfully`, { exam });
});

/**
 * Submit Exam (In-Memory Evaluation)
 * Accepts examId and answers array.
 * Calculates score in-memory, returns details, DOES NOT save to DB.
 */
const submitExam = asyncHandler(async (req, res, next) => {
  const { examId, answers } = req.body;

  if (!examId || !answers || !Array.isArray(answers)) {
    return next(new ValidationError('examId and answers array are required'));
  }

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return next(new ValidationError('Invalid Exam ID format'));
  }

  // Fetch exam
  const exam = await Exam.findById(examId);
  if (!exam) {
    return next(new NotFoundError('Exam not found'));
  }

  // Enforce that only published exams can be submitted by users
  if (req.user.role === 'user' && !exam.isPublished) {
    return next(new ForbiddenError('Cannot submit answers for an unpublished exam'));
  }

  let marksObtained = 0;
  let correctAnswersCount = 0;
  let incorrectAnswersCount = 0;
  const evaluationDetails = [];

  // Grade the submission
  exam.questions.forEach((q) => {
    // Look for a matching answer in the submission
    const submitted = answers.find((ans) => ans.questionId === q._id.toString());
    const selectedAnswer = submitted ? (submitted.selectedAnswer || submitted.answer) : null;

    if (q.type === 'descriptive') {
      evaluationDetails.push({
        questionId: q._id,
        question: q.question,
        type: q.type,
        answer: selectedAnswer,
        marks: q.marks,
        marksAwarded: 0 // Not auto-evaluated
      });
      return;
    }

    let isCorrect = false;

    // Normalise and compare
    if (selectedAnswer !== null && selectedAnswer !== undefined) {
      const normalizedSelected = selectedAnswer.toString().trim().toLowerCase();
      const normalizedCorrect = q.correctAnswer ? q.correctAnswer.toString().trim().toLowerCase() : '';

      if (normalizedSelected === normalizedCorrect) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      marksObtained += q.marks;
      correctAnswersCount++;
    } else {
      incorrectAnswersCount++;
    }

    evaluationDetails.push({
      questionId: q._id,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: req.user.role === 'admin' ? q.correctAnswer : undefined, // Keep key hidden from regular users if desired, or include as feedback
      selectedAnswer,
      isCorrect,
      marks: q.marks,
      marksAwarded: isCorrect ? q.marks : 0
    });
  });

  const resultSummary = {
    examId: exam._id,
    examTitle: exam.title,
    totalQuestions: exam.questions.length,
    correctAnswersCount,
    incorrectAnswersCount,
    totalMarks: exam.totalMarks,
    marksObtained,
    percentage: exam.totalMarks > 0 ? Number(((marksObtained / exam.totalMarks) * 100).toFixed(2)) : 0
  };

  // Database Save with proper logging and duplicate prevention logic
  let savedResult;
  try {
    savedResult = await Result.create({
      user: req.user._id,
      userEmail: req.user.userEmail || req.user.anantEmail || 'Unknown',
      examId: exam._id,
      examName: exam.title,
      marksObtained: resultSummary.marksObtained,
      totalMarks: resultSummary.totalMarks,
      percentage: resultSummary.percentage,
      evaluation: evaluationDetails,
      status: 'Completed'
    });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[INFO] Duplicate result submission prevention triggered for user ${req.user._id} and exam ${exam._id}.`);
      // Find existing submission to return it
      savedResult = await Result.findOne({ user: req.user._id, examId: exam._id });
    } else {
      console.error('[ERROR] Failed to save exam submission:', err);
      return next(err);
    }
  }

  return sendResponse(res, 200, 'Exam submitted and graded successfully', {
    summary: {
      ...resultSummary,
      _id: savedResult ? savedResult._id : undefined
    },
    evaluation: evaluationDetails
  });
});

/**
 * Get All Submissions (Admin Only)
 */
const getAllSubmissions = asyncHandler(async (req, res, next) => {
  const submissions = await Result.find({})
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, 'All exam submissions retrieved successfully', { submissions });
});

/**
 * Delete Submission (Admin Only)
 */
const deleteSubmission = asyncHandler(async (req, res, next) => {
  console.log(`🗑️ [DELETE SUBMISSION REQUEST] Target ID: "${req.params.id}" requested by Admin ID: "${req.user ? req.user._id : 'unknown'}"`);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.error(`❌ [DELETE SUBMISSION ERROR] Invalid ObjectId format: "${req.params.id}"`);
    return next(new NotFoundError('Submission not found'));
  }

  const submission = await Result.findByIdAndDelete(req.params.id);

  if (!submission) {
    console.error(`❌ [DELETE SUBMISSION ERROR] Submission with ID "${req.params.id}" not found in database.`);
    return next(new NotFoundError('Submission not found'));
  }

  console.log(`✓ [DELETE SUBMISSION SUCCESS] Submission "${req.params.id}" deleted successfully.`);
  return sendResponse(res, 200, 'Submission deleted successfully');
});

/**
 * Get Completed Exams for Current User (User and Admin)
 */
const getCompletedExams = asyncHandler(async (req, res, next) => {
  const submissions = await Result.find({ user: req.user._id }).select('examId');
  const completedExamIds = submissions.map((sub) => sub.examId.toString());

  return sendResponse(res, 200, 'Completed exam IDs retrieved successfully', { completedExamIds });
});

module.exports = {
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
};
