// src/validators/contact.validator.js
const Joi = require('joi');

const contactSchema = Joi.object({
  name: Joi.string().min(2).max(60).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .allow('', null),
  subject: Joi.string().max(150).trim().optional().allow('', null),
  message: Joi.string().min(10).max(2000).trim().required(),
  captchaToken: Joi.string().optional().allow('', null),
});

module.exports = { contactSchema };
