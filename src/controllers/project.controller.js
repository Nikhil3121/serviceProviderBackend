// src/controllers/project.controller.js
const Project = require('../models/Project');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { ApiError, ApiResponse } = require('../utils/ApiError');
const { asyncHandler, getPaginationParams, getSortParams } = require('../utils/helpers');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'projects:';

const invalidateProjectCache = async () => {
  await cache.delPattern(`${CACHE_PREFIX}*`);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects  (public)
// ─────────────────────────────────────────────────────────────────────────────
exports.getProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const sort = getSortParams(req.query, ['createdAt', 'title', 'order', 'viewCount']);

  const filter = { isActive: true };
  if (req.query.category) filter.category = new RegExp(req.query.category, 'i');
  if (req.query.featured === 'true') filter.isFeatured = true;
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify({ filter, sort, page, limit })}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, message: 'Projects fetched', ...cached });
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  const meta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };

  await cache.set(cacheKey, { data: projects, meta }, CACHE_TTL);

  return ApiResponse.paginated(res, projects, total, page, limit, 'Projects fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:slugOrId  (public)
// ─────────────────────────────────────────────────────────────────────────────
exports.getProject = asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;
  const isObjectId = /^[a-f\d]{24}$/i.test(slugOrId);

  const cacheKey = `${CACHE_PREFIX}single:${slugOrId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return ApiResponse.success(res, cached, 'Project fetched');

  const filter = isObjectId ? { _id: slugOrId } : { slug: slugOrId };
  const project = await Project.findOne({ ...filter, isActive: true })
    .populate('createdBy', 'name email')
    .lean();

  if (!project) throw ApiError.notFound('Project not found');

  // Increment view count (non-blocking)
  Project.findByIdAndUpdate(project._id, { $inc: { viewCount: 1 } }).exec();

  await cache.set(cacheKey, project, CACHE_TTL);
  return ApiResponse.success(res, project, 'Project fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/categories  (public)
// ─────────────────────────────────────────────────────────────────────────────
exports.getCategories = asyncHandler(async (req, res) => {
  const cacheKey = `${CACHE_PREFIX}categories`;
  const cached = await cache.get(cacheKey);
  if (cached) return ApiResponse.success(res, cached, 'Categories fetched');

  const categories = await Project.aggregate([
    { $match: { isActive: true, isDeleted: { $ne: true } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
  ]);

  await cache.set(cacheKey, categories, CACHE_TTL * 2);
  return ApiResponse.success(res, categories, 'Categories fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/projects  (admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.body,
    createdBy: req.user._id,
  };

  // Handle image uploads
  if (req.files?.length > 0) {
    const uploadPromises = req.files.map((file, idx) =>
      uploadImage(file.buffer || file.path, 'service-provider/projects').then((result) => ({
        url: result.url,
        publicId: result.publicId,
        alt: file.originalname,
        isPrimary: idx === 0,
      }))
    );
    projectData.images = await Promise.all(uploadPromises);
  }

  const project = await Project.create(projectData);
  await invalidateProjectCache();

  logger.info(`Project created: ${project.title} by ${req.user.email}`);
  return ApiResponse.created(res, project, 'Project created successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/projects/:id  (admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  // Handle new image uploads
  if (req.files?.length > 0) {
    const uploadPromises = req.files.map((file) =>
      uploadImage(file.buffer || file.path, 'service-provider/projects').then((result) => ({
        url: result.url,
        publicId: result.publicId,
        alt: file.originalname,
        isPrimary: false,
      }))
    );
    const newImages = await Promise.all(uploadPromises);
    req.body.images = [...(project.images || []), ...newImages];
  }

  const updated = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: { ...req.body, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );

  await invalidateProjectCache();
  logger.info(`Project updated: ${project.title} by ${req.user.email}`);
  return ApiResponse.success(res, updated, 'Project updated successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/projects/:id  (admin — soft delete)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  // Soft delete
  await Project.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });

  await invalidateProjectCache();
  logger.info(`Project deleted (soft): ${project.title} by ${req.user.email}`);
  return ApiResponse.success(res, null, 'Project deleted successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/projects/:id/images/:publicId  (admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteProjectImage = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  const publicId = decodeURIComponent(req.params.publicId);
  const image = project.images.find((img) => img.publicId === publicId);
  if (!image) throw ApiError.notFound('Image not found');

  await deleteImage(publicId);
  project.images = project.images.filter((img) => img.publicId !== publicId);

  // Ensure at least one image is primary
  if (project.images.length > 0 && !project.images.some((img) => img.isPrimary)) {
    project.images[0].isPrimary = true;
  }

  await project.save();
  await invalidateProjectCache();
  return ApiResponse.success(res, null, 'Image deleted successfully');
});
