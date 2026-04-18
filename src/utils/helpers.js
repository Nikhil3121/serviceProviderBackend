// src/utils/helpers.js
const crypto = require('crypto');

/**
 * Wraps async route handlers to catch errors and forward to error middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Generate a cryptographically secure numeric OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  const bytes = crypto.randomBytes(length);
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % digits.length];
  }
  return otp;
};

/**
 * Generate a secure random token (hex)
 */
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/**
 * Hash a token for storage (not for passwords — use bcrypt for those)
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Parse pagination params from query string
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
    Math.max(1, parseInt(query.limit, 10) || parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build a MongoDB sort object from query string
 * e.g. ?sort=-createdAt,name  => { createdAt: -1, name: 1 }
 */
const getSortParams = (query, allowedFields = []) => {
  if (!query.sort) return { createdAt: -1 };
  const sort = {};
  const fields = query.sort.split(',');
  fields.forEach((field) => {
    const trimmed = field.trim();
    const dir = trimmed.startsWith('-') ? -1 : 1;
    const key = trimmed.replace(/^-/, '');
    if (allowedFields.length === 0 || allowedFields.includes(key)) {
      sort[key] = dir;
    }
  });
  return Object.keys(sort).length > 0 ? sort : { createdAt: -1 };
};

/**
 * Sanitize user data before sending in response
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

/**
 * Pick only allowed fields from an object
 */
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

/**
 * Mask email for display: john***@example.com
 */
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 3) + '***';
  return `${masked}@${domain}`;
};

/**
 * Mask phone for display: +91*****9999
 */
const maskPhone = (phone) => {
  const str = phone.toString();
  return str.slice(0, 3) + '*'.repeat(str.length - 6) + str.slice(-3);
};

module.exports = {
  asyncHandler,
  generateOTP,
  generateToken,
  hashToken,
  getPaginationParams,
  getSortParams,
  sanitizeUser,
  pick,
  maskEmail,
  maskPhone,
};
