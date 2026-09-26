const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    adminPassword: {
      type: String,
      select: false
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'admin'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    anantEmail: { type: String, trim: true, lowercase: true },
    userEmail: { type: String, trim: true, lowercase: true },
    userPhoneNumber: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password and align admin fields
userSchema.pre('save', async function (next) {
  // Sync email & adminEmail
  if (this.adminEmail && !this.email) {
    this.email = this.adminEmail;
  } else if (this.email && !this.adminEmail) {
    this.adminEmail = this.email;
  }

  this.anantEmail = this.email || this.adminEmail;
  this.userEmail = this.email || this.adminEmail;
  if (!this.userPhoneNumber) {
    this.userPhoneNumber = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  }

  // Hash adminPassword if modified
  if (this.adminPassword && this.isModified('adminPassword')) {
    const salt = await bcrypt.genSalt(10);
    this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
    this.password = this.adminPassword;
  } else if (this.password && this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.adminPassword) this.adminPassword = this.password;
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  const targetHash = this.adminPassword || this.password;
  if (!targetHash) return false;
  return await bcrypt.compare(candidatePassword, targetHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
