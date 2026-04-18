// src/middlewares/captcha.middleware.js
const captchaService = require('../services/captcha.service');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const verifyCaptcha = asyncHandler(async (req, _res, next) => {
  // ✅ Skip in dev OR when disabled
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.CAPTCHA_ENABLED === 'false'
  ) {
    return next();
  }

  const token =
    req.body.captchaToken ||
    req.body.recaptchaToken ||
    req.headers['x-captcha-token'];

  if (!token) {
    throw ApiError.badRequest('CAPTCHA token missing');
  }

  const result = await captchaService.verify(token, req.ip);

  if (!result.success) {
    throw ApiError.badRequest(result.message || 'CAPTCHA verification failed');
  }

  next();
});

module.exports = { verifyCaptcha };
