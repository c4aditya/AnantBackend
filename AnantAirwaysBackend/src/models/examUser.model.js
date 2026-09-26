const mongoose = require('mongoose');

const examUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'User Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone Number is required'],
      trim: true
    },
    examToken: {
      type: String,
      default: null,
      index: true
    },
    examTokenExpiresAt: {
      type: Date,
      default: null
    },
    examStatus: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending'
    },
    score: {
      type: Number,
      default: null
    },
    totalMarks: {
      type: Number,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    resultSent: {
      type: Boolean,
      default: false
    },
    emailSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const ExamUser = mongoose.model('ExamUser', examUserSchema);

module.exports = ExamUser;
