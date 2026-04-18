// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{6,14}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// NOTE: email and phone already indexed via unique:true in schema definition
userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// ── Virtuals ───────────────────────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('isFullyVerified').get(function () {
  return this.isEmailVerified && this.isPhoneVerified;
});

// ── Pre-save: Hash password ────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(
    this.password,
    parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12
  );
  this.passwordChangedAt = Date.now() - 1000; // ensure JWTs issued before this are invalid
  next();
});

// ── Pre-find: Exclude soft-deleted ────────────────────────────────────────
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Instance Methods ───────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedAt;
  }
  return false;
};

userSchema.methods.incLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $unset: { lockUntil: 1 }, $set: { loginAttempts: 1 } });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $unset: { lockUntil: 1 }, $set: { loginAttempts: 0 } });
};

userSchema.methods.addRefreshToken = async function (token) {
  const MAX_SESSIONS = 5;
  const tokens = this.refreshTokens || [];
  tokens.push(token);
  if (tokens.length > MAX_SESSIONS) tokens.splice(0, tokens.length - MAX_SESSIONS);
  this.refreshTokens = tokens;
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.removeRefreshToken = async function (token) {
  this.refreshTokens = (this.refreshTokens || []).filter((t) => t !== token);
  return this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);
module.exports = User;
