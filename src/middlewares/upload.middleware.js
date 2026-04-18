// src/middlewares/upload.middleware.js
const multer = require('multer');
const path = require('path');
const { ApiError } = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage(); // Store in memory; upload to Cloudinary from buffer

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        `Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, GIF`
      ),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

/**
 * Upload a single image
 * @param {string} fieldName - form field name
 */
const uploadSingle = (fieldName = 'image') => upload.single(fieldName);

/**
 * Upload multiple images
 * @param {string} fieldName - form field name
 * @param {number} maxCount
 */
const uploadMultiple = (fieldName = 'images', maxCount = 5) =>
  upload.array(fieldName, maxCount);

/**
 * Upload multiple named fields
 */
const uploadFields = (fields) => upload.fields(fields);

module.exports = { uploadSingle, uploadMultiple, uploadFields };
