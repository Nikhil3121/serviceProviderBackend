// src/routes/contact.routes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { verifyCaptcha } = require('../middlewares/captcha.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { contactLimiter } = require('../middlewares/rateLimiter.middleware');
const { contactSchema } = require('../validators/contact.validator');

router.post('/', contactLimiter, validate(contactSchema), verifyCaptcha, contactController.submitContact);

module.exports = router;
