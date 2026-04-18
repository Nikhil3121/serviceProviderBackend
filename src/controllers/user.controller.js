// src/controllers/user.controller.js
const User = require('../models/User');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { ApiError, ApiResponse } = require('../utils/ApiError');
const { asyncHandler, sanitizeUser } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return ApiResponse.success(res, sanitizeUser(user), 'Profile fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/me
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const ALLOWED = ['name'];
  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, sanitizeUser(user), 'Profile updated');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/me/avatar
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const user = await User.findById(req.user._id);

  // Delete old avatar from Cloudinary
  if (user.avatar?.publicId) {
    await deleteImage(user.avatar.publicId).catch(() => {});
  }

  const result = await uploadImage(
    req.file.buffer || req.file.path,
    'service-provider/avatars'
  );

  user.avatar = { url: result.url, publicId: result.publicId };
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, { avatar: user.avatar }, 'Avatar uploaded');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/me/avatar
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.avatar?.publicId) {
    await deleteImage(user.avatar.publicId).catch(() => {});
  }

  user.avatar = { url: '', publicId: '' };
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, null, 'Avatar removed');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/me  (self-deactivate)
// ─────────────────────────────────────────────────────────────────────────────
exports.deactivateAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { isDeleted: true, deletedAt: new Date(), isActive: false, refreshTokens: [] },
  });
  logger.info(`User self-deactivated: ${req.user.email}`);
  return ApiResponse.success(res, null, 'Account deactivated');
});
