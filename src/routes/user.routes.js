// src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');

router.use(protect);

router.get('/',            userController.getProfile);
router.patch('/',          userController.updateProfile);
router.post('/avatar',     uploadSingle('avatar'), userController.uploadAvatar);
router.delete('/avatar',   userController.deleteAvatar);
router.delete('/',         userController.deactivateAccount);

module.exports = router;
