// src/middlewares/auth.middleware.js
const User = require('../models/User');
const tokenService = require('../services/token.service');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Protect routes — verifies JWT access token
 */
const protect = asyncHandler(async (req, _res, next) => {
  let token;

  // Extract token from Authorization header or cookie
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) throw ApiError.unauthorized('Access token required');

  const decoded = tokenService.verifyAccessToken(token);

  const user = await User.findById(decoded.sub).select(
    '+passwordChangedAt +loginAttempts +lockUntil'
  );

  if (!user) throw ApiError.unauthorized('User not found or token invalid');
  if (user.isDeleted) throw ApiError.unauthorized('Account has been deactivated');
  if (!user.isActive) throw ApiError.unauthorized('Account is inactive. Contact support.');

  // Check password changed after token issued
  if (user.changedPasswordAfter(decoded.iat)) {
    throw ApiError.unauthorized('Password was recently changed. Please log in again.');
  }

  req.user = user;
  next();
});

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  });

/**
 * Require fully verified account (email + phone)
 */
const requireVerified = asyncHandler(async (req, _res, next) => {
  if (!req.user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email address to continue');
  }
  if (!req.user.isPhoneVerified) {
    throw ApiError.forbidden('Please verify your phone number to continue');
  }
  next();
});

/**
 * Optional auth — doesn't throw if no token, but populates req.user if valid
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (token) {
      const decoded = tokenService.verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (user && !user.isDeleted && user.isActive) req.user = user;
    }
  } catch {
    // Silent fail — optional auth
  }
  next();
});

module.exports = { protect, restrictTo, requireVerified, optionalAuth };
