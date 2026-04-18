// src/middlewares/rateLimiter.middleware.js
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createLimiter = (options) => {
  const defaults = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${req.ip} — ${req.path}`);
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    skip: (req) => process.env.NODE_ENV === 'test',
    keyGenerator: (req) => req.ip,
  };

  return rateLimit({ ...defaults, ...options });
};

// Global rate limiter — all routes
const globalLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP. Please try again in 15 minutes.',
});

// Login limiter — stricter
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true,
});

// Signup limiter
const signupLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many accounts created from this IP. Please try again after an hour.',
});

// OTP limiter
const otpLimiter = createLimiter({
  windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 3,
  message: 'Too many OTP requests. Please try again in an hour.',
});

// Contact form limiter
const contactLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many contact form submissions. Please try again after an hour.',
});

// Password reset limiter
const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Too many password reset requests. Please try again in 15 minutes.',
});

// API limiter — general API routes
const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'API rate limit exceeded. Please slow down your requests.',
});

module.exports = {
  globalLimiter,
  loginLimiter,
  signupLimiter,
  otpLimiter,
  contactLimiter,
  passwordResetLimiter,
  apiLimiter,
};
