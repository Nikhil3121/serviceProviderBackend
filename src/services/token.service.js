// src/services/token.service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

class TokenService {
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      issuer: process.env.APP_NAME || 'service-provider',
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.APP_NAME || 'service-provider',
    });
  }

  generateTokenPair(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Access token expired');
      if (error.name === 'JsonWebTokenError') throw ApiError.unauthorized('Invalid access token');
      throw ApiError.unauthorized('Token verification failed');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Refresh token expired');
      if (error.name === 'JsonWebTokenError') throw ApiError.unauthorized('Invalid refresh token');
      throw ApiError.unauthorized('Token verification failed');
    }
  }

  generatePasswordResetToken() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() +
        parseInt(process.env.JWT_RESET_PASSWORD_EXPIRES_IN || '10', 10) * 60 * 1000
    );
    return { rawToken, hashedToken, expiresAt };
  }

  generateEmailVerificationToken() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    return { rawToken, hashedToken, expiresAt };
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getAccessTokenExpiry() {
    const expires = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const ms = require('ms');
    return new Date(Date.now() + ms(expires));
  }
}

module.exports = new TokenService();
