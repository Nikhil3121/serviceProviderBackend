// src/services/captcha.service.js
const axios = require('axios');
const logger = require('../utils/logger');

class CaptchaService {
  async verify(token, remoteIp = '') {
    if (!token) return { success: false, message: 'CAPTCHA token is required' };

    // Skip verification in test/development (optional)
    if (process.env.NODE_ENV === 'test') return { success: true };

    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        logger.warn('reCAPTCHA secret key not configured');
        return { success: true }; // Fail open if not configured (dev only)
      }

      const params = new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      });

      const { data } = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        }
      );

      const version = process.env.RECAPTCHA_VERSION || 'v3';

      if (version === 'v3') {
        const threshold = parseFloat(process.env.RECAPTCHA_THRESHOLD || '0.5');
        if (!data.success || data.score < threshold) {
          logger.warn(`reCAPTCHA v3 failed: score=${data.score}, errors=${data['error-codes']}`);
          return { success: false, message: 'CAPTCHA verification failed. Please try again.' };
        }
      } else {
        if (!data.success) {
          logger.warn(`reCAPTCHA v2 failed: errors=${data['error-codes']}`);
          return { success: false, message: 'CAPTCHA verification failed. Please try again.' };
        }
      }

      return { success: true, score: data.score };
    } catch (error) {
      logger.error('CAPTCHA verification error:', error.message);
      // Fail open on network errors (you can change this to fail closed in production)
      return { success: true };
    }
  }
}

module.exports = new CaptchaService();
