// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const contactController = require('../controllers/contact.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

router.use(protect, restrictTo('admin'));

// ── Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboardStats);

// ── User management ───────────────────────────────────────────────────────
router.get('/users',          adminController.getAllUsers);
router.get('/users/:id',      adminController.getUser);
router.patch('/users/:id',    adminController.updateUser);
router.delete('/users/:id',   adminController.deleteUser);

// ── Contact management ────────────────────────────────────────────────────
router.get('/contacts',          contactController.getAllContacts);
router.get('/contacts/:id',      contactController.getContact);
router.patch('/contacts/:id',    contactController.updateContact);
router.delete('/contacts/:id',   contactController.deleteContact);

module.exports = router;
