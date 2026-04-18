// src/controllers/auth.controller.js
const crypto = require('crypto');
const User = require('../models/User');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');
const otpService = require('../services/otp.service');
const { ApiError, ApiResponse } = require('../utils/ApiError');
const { asyncHandler, sanitizeUser, maskEmail } = require('../utils/helpers');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'strict',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const ms = require('ms');
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ms(process.env.JWT_ACCESS_EXPIRES_IN || '15m'),
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: ms(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
exports.signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'phone';
    throw ApiError.conflict(`An account with this ${field} already exists`);
  }

  const user = await User.create({ name, email, phone, password });

  // Generate email verification token
  const { rawToken, hashedToken, expiresAt } =
    tokenService.generateEmailVerificationToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  // Send verification email (non-blocking)
  emailService.sendVerificationEmail(user, verificationUrl).catch((err) =>
    logger.error('Verification email failed:', err.message)
  );

  // Send OTP to phone
  const otp = await otpService.generateAndStore(user._id, phone, 'phone-verification');
  otpService.sendOTP(phone, otp).catch((err) =>
    logger.error('OTP send failed:', err.message)
  );

  logger.info(`New user registered: ${email}`);

  return ApiResponse.created(
    res,
    { userId: user._id, email: maskEmail(email), phone: phone.slice(0, -4) + '****' },
    'Account created successfully. Please verify your email and phone to activate your account.'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email?token=xxx
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw ApiError.badRequest('Verification token is required');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) throw ApiError.badRequest('Invalid or expired verification token');
  if (user.isEmailVerified) {
    return ApiResponse.success(res, null, 'Email is already verified');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Send welcome email if phone is also verified
  if (user.isPhoneVerified) {
    emailService.sendWelcomeEmail(user).catch(() => {});
  }

  logger.info(`Email verified: ${user.email}`);
  return ApiResponse.success(res, null, 'Email verified successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });
  if (!user) throw ApiError.notFound('No account found with this phone number');
  if (user.isPhoneVerified) {
    return ApiResponse.success(res, null, 'Phone is already verified');
  }

  const result = await otpService.verifyOTP(phone, otp, 'phone-verification');
  if (!result.success) throw ApiError.badRequest(result.message);

  user.isPhoneVerified = true;
  await user.save({ validateBeforeSave: false });

  if (user.isEmailVerified) {
    emailService.sendWelcomeEmail(user).catch(() => {});
  }

  logger.info(`Phone verified: ${phone}`);
  return ApiResponse.success(res, null, 'Phone number verified successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) throw ApiError.notFound('No account found with this phone number');
  if (user.isPhoneVerified) throw ApiError.badRequest('Phone is already verified');

  const otp = await otpService.generateAndStore(user._id, phone, 'phone-verification');
  await otpService.sendOTP(phone, otp);

  return ApiResponse.success(res, null, 'OTP resent successfully. Please check your phone.');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    '+password +loginAttempts +lockUntil +refreshTokens'
  );

  if (!user) throw ApiError.unauthorized('Invalid email or password');

  // Account lock check
  if (user.isLocked) {
    const lockRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.tooManyRequests(
      `Account temporarily locked due to too many failed attempts. Try again in ${lockRemaining} minute(s).`
    );
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.isDeleted) throw ApiError.unauthorized('Account has been deactivated');
  if (!user.isActive) throw ApiError.unauthorized('Account is inactive. Please contact support.');

  // Reset login attempts on success
  await user.resetLoginAttempts();

  const { accessToken, refreshToken } = tokenService.generateTokenPair(user);

  // Store refresh token
  await user.addRefreshToken(refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken);

  logger.info(`User logged in: ${email}`);

  return ApiResponse.success(
    res,
    {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresAt: tokenService.getAccessTokenExpiry(),
    },
    'Logged in successfully'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingToken) throw ApiError.unauthorized('Refresh token required');

  const decoded = tokenService.verifyRefreshToken(incomingToken);

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized('User not found');
  if (user.isDeleted || !user.isActive) throw ApiError.unauthorized('Account is inactive');

  // Validate token belongs to this user
  if (!user.refreshTokens?.includes(incomingToken)) {
    // Potential token reuse — invalidate all sessions
    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });
    throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.');
  }

  // Rotate refresh token
  user.refreshTokens = user.refreshTokens.filter((t) => t !== incomingToken);
  const { accessToken, refreshToken: newRefreshToken } = tokenService.generateTokenPair(user);
  user.refreshTokens.push(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, newRefreshToken);

  return ApiResponse.success(
    res,
    { accessToken, refreshToken: newRefreshToken, expiresAt: tokenService.getAccessTokenExpiry() },
    'Token refreshed successfully'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (incomingToken && req.user) {
    await req.user.removeRefreshToken(incomingToken);
  }

  clearAuthCookies(res);
  logger.info(`User logged out: ${req.user?.email}`);
  return ApiResponse.success(res, null, 'Logged out successfully');
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout-all  (all sessions)
// ─────────────────────────────────────────────────────────────────────────────
exports.logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshTokens');
  user.refreshTokens = [];
  await user.save({ validateBeforeSave: false });
  clearAuthCookies(res);
  return ApiResponse.success(res, null, 'Logged out from all devices successfully');
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return ApiResponse.success(
      res,
      null,
      'If that email is registered, a password reset link has been sent.'
    );
  }

  const { rawToken, hashedToken, expiresAt } = tokenService.generatePasswordResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  emailService.sendPasswordResetEmail(user, resetUrl).catch((err) =>
    logger.error('Password reset email failed:', err.message)
  );

  logger.info(`Password reset requested: ${email}`);
  return ApiResponse.success(
    res,
    null,
    'If that email is registered, a password reset link has been sent.'
  );
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+refreshTokens');

  if (!user) throw ApiError.badRequest('Invalid or expired password reset token');

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all sessions
  await user.save();

  emailService.sendPasswordChangedEmail(user).catch(() => {});

  logger.info(`Password reset success: ${user.email}`);
  clearAuthCookies(res);
  return ApiResponse.success(res, null, 'Password reset successfully. Please log in.');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password +refreshTokens');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  user.refreshTokens = []; // Invalidate all other sessions
  await user.save();

  emailService.sendPasswordChangedEmail(user).catch(() => {});

  clearAuthCookies(res);
  logger.info(`Password changed: ${user.email}`);
  return ApiResponse.success(res, null, 'Password changed successfully. Please log in again.');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.isEmailVerified) {
    return ApiResponse.success(
      res,
      null,
      'If that email exists and is unverified, a verification link has been sent.'
    );
  }

  const { rawToken, hashedToken, expiresAt } = tokenService.generateEmailVerificationToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  emailService.sendVerificationEmail(user, verificationUrl).catch(() => {});

  return ApiResponse.success(
    res,
    null,
    'If that email exists and is unverified, a verification link has been sent.'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return ApiResponse.success(res, sanitizeUser(user), 'Profile fetched');
});
