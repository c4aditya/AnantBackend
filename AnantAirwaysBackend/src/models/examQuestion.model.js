const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['written', 'mcq'],
      default: 'mcq'
    },
    level: {
      type: String,
      default: 'Beginner',
      trim: true
    },
    options: {
      type: [String],
      default: []
    },
    correctAnswer: {
      type: String,
      default: '',
      trim: true
    },
    marks: {
      type: Number,
      required: [true, 'Marks for the question is required'],
      min: [1, 'Marks must be at least 1'],
      default: 1
    }
  },
  {
    timestamps: true
  }
);

const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);

module.exports = ExamQuestion;
