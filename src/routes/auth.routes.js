// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { verifyCaptcha } = require('../middlewares/captcha.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  loginLimiter,
  signupLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require('../middlewares/rateLimiter.middleware');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require('../validators/auth.validator');

// ── Public routes ────────────────────────────────────────────────────────────
router.post('/signup',   signupLimiter,        validate(signupSchema),          verifyCaptcha, authController.signup);
router.post('/login',    loginLimiter,         validate(loginSchema),           verifyCaptcha, authController.login);
router.post('/refresh',                                                                        authController.refreshToken);
router.get( '/verify-email',                                                                   authController.verifyEmail);
router.post('/verify-otp',                     validate(verifyOtpSchema),                     authController.verifyOTP);
router.post('/resend-otp',         otpLimiter, validate(resendOtpSchema),                     authController.resendOTP);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), verifyCaptcha, authController.forgotPassword);
router.post('/reset-password',                 validate(resetPasswordSchema),                 authController.resetPassword);
router.post('/resend-verification',                                                            authController.resendVerificationEmail);

// ── Protected routes ─────────────────────────────────────────────────────────
router.use(protect);

router.get( '/me',                                                                             authController.getMe);
router.post('/logout',                                                                         authController.logout);
router.post('/logout-all',                                                                     authController.logoutAll);
router.post('/change-password',  validate(changePasswordSchema),                              authController.changePassword);

module.exports = router;
