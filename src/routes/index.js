// src/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes    = require('./auth.routes');
const contactRoutes = require('./contact.routes');
const projectRoutes = require('./project.routes');
const userRoutes    = require('./user.routes');
const adminRoutes   = require('./admin.routes');

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
  });
});

router.use('/auth',     authRoutes);
router.use('/contact',  contactRoutes);
router.use('/projects', projectRoutes);
router.use('/users/me', userRoutes);
router.use('/admin',    adminRoutes);

module.exports = router;
