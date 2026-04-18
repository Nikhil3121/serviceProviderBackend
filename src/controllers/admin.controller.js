// src/controllers/admin.controller.js
const User = require('../models/User');
const Project = require('../models/Project');
const Contact = require('../models/Contact');
const { ApiError, ApiResponse } = require('../utils/ApiError');
const { asyncHandler, getPaginationParams, getSortParams, sanitizeUser } = require('../utils/helpers');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const cacheKey = 'admin:dashboard:stats';
  const cached = await cache.get(cacheKey);
  if (cached) return ApiResponse.success(res, cached, 'Dashboard stats');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    verifiedUsers,
    totalProjects,
    activeProjects,
    totalContacts,
    newContactsThisMonth,
    unreadContacts,
    recentUsers,
    userGrowth,
    contactsByStatus,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    User.countDocuments({ isEmailVerified: true, isPhoneVerified: true }),
    Project.countDocuments({}),
    Project.countDocuments({ isActive: true }),
    Contact.countDocuments({}),
    Contact.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Contact.countDocuments({ status: 'new' }),
    User.find({}).sort({ createdAt: -1 }).limit(5).select('name email createdAt isEmailVerified isPhoneVerified role').lean(),
    User.aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Contact.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const userGrowthRate = newUsersLastMonth === 0
    ? 100
    : Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100);

  const stats = {
    overview: {
      totalUsers,
      newUsersThisMonth,
      userGrowthRate,
      verifiedUsers,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      totalProjects,
      activeProjects,
      totalContacts,
      newContactsThisMonth,
      unreadContacts,
    },
    charts: {
      userGrowth: userGrowth.map((d) => ({ date: d._id, count: d.count })),
      contactsByStatus: contactsByStatus.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
    },
    recentUsers,
    generatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, stats, 60); // 1 minute cache
  return ApiResponse.success(res, stats, 'Dashboard stats fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const sort = getSortParams(req.query, ['createdAt', 'name', 'email', 'role', 'lastLogin']);

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.verified === 'true') {
    filter.isEmailVerified = true;
    filter.isPhoneVerified = true;
  }
  if (req.query.active === 'false') filter.isActive = false;
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, users, total, page, limit, 'Users fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ApiResponse.success(res, sanitizeUser(user), 'User fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const ALLOWED = ['role', 'isActive', 'isEmailVerified', 'isPhoneVerified', 'name'];
  const updates = {};
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  // Prevent admin from demoting themselves
  if (req.params.id === req.user._id.toString() && updates.role === 'user') {
    throw ApiError.forbidden('You cannot demote yourself');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) throw ApiError.notFound('User not found');
  logger.info(`Admin ${req.user.email} updated user ${user.email}: ${JSON.stringify(updates)}`);
  return ApiResponse.success(res, sanitizeUser(user), 'User updated');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id  (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.forbidden('You cannot delete your own account');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } },
    { new: true }
  );

  if (!user) throw ApiError.notFound('User not found');
  logger.info(`Admin ${req.user.email} soft-deleted user ${user.email}`);
  return ApiResponse.success(res, null, 'User deleted');
});
