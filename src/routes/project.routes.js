// src/routes/project.routes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { uploadMultiple } = require('../middlewares/upload.middleware');
const { apiLimiter } = require('../middlewares/rateLimiter.middleware');

// ── Public routes ────────────────────────────────────────────────────────────
router.get('/',              apiLimiter, projectController.getProjects);
router.get('/categories',    apiLimiter, projectController.getCategories);
router.get('/:slugOrId',     apiLimiter, projectController.getProject);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.use(protect, restrictTo('admin'));

router.post('/',   uploadMultiple('images', 8), projectController.createProject);
router.put('/:id', uploadMultiple('images', 8), projectController.updateProject);
router.delete('/:id',                           projectController.deleteProject);
router.delete('/:id/images/:publicId',          projectController.deleteProjectImage);

module.exports = router;
