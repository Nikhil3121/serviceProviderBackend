// src/validators/auth.validator.js
const Joi = require('joi');

const passwordRule = Joi.string()
  .min(8)
  .max(64)
  .pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?])/
  )
  .messages({
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters',
  });

const phoneRule = Joi.string()
  .pattern(/^\+?[1-9]\d{6,14}$/)
  .messages({ 'string.pattern.base': 'Please provide a valid phone number (e.g. +919876543210)' });

const captchaRule = Joi.string().optional().allow('', null);

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(60).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: phoneRule.required(),
  password: passwordRule.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
  captchaToken: captchaRule,
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
  captchaToken: captchaRule,
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  captchaToken: captchaRule,
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRule.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordRule.required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const verifyOtpSchema = Joi.object({
  phone: phoneRule.required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only digits',
  }),
});

const resendOtpSchema = Joi.object({
  phone: phoneRule.required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  refreshTokenSchema,
};
