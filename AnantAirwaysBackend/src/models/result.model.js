const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    userEmail: {
      type: String,
      required: [true, 'User Email is required']
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam ID is required']
    },
    examName: {
      type: String,
      required: [true, 'Exam Name is required']
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required']
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required']
    },
    percentage: {
      type: Number,
      required: [true, 'Percentage is required']
    },
    evaluation: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Evaluation details are required']
    },
    status: {
      type: String,
      default: 'Completed'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate submissions by the same user for the same exam
resultSchema.index({ user: 1, examId: 1 }, { unique: true });

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;
