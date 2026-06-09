const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'descriptive'],
    default: 'mcq'
  },
  options: {
    type: [String],
    validate: {
      validator: function (val) {
        if (this.type === 'descriptive') return true;
        return val && val.length >= 2;
      },
      message: 'A question must have at least 2 options'
    }
  },
  correctAnswer: {
    type: String,
    required: [
      function () {
        return this.type === 'mcq' || !this.type;
      },
      'Correct answer is required'
    ],
    trim: true
  },
  marks: {
    type: Number,
    required: [true, 'Marks for the question is required'],
    min: [0, 'Marks cannot be negative'],
    default: 1
  }
});

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    durationInMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    questions: {
      type: [questionSchema],
      required: [true, 'Questions are required'],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'An exam must contain at least 1 question'
      }
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate total marks automatically
examSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  } else {
    this.totalMarks = 0;
  }
  next();
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
