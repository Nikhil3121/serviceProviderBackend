// src/controllers/contact.controller.js
const Contact = require('../models/Contact');
const emailService = require('../services/email.service');
const { ApiError, ApiResponse } = require('../utils/ApiError');
const { asyncHandler, getPaginationParams, getSortParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contact
// ─────────────────────────────────────────────────────────────────────────────
exports.submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const contact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Fire & forget emails
  Promise.all([
    emailService.sendContactNotification({ name, email, phone, subject, message }),
    emailService.sendContactAutoReply({ name, email }),
  ]).catch((err) => logger.error('Contact email failed:', err.message));

  logger.info(`Contact form submitted: ${email}`);

  return ApiResponse.created(
    res,
    { id: contact._id },
    'Your message has been received. We will get back to you within 24–48 hours.'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/contacts  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllContacts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const sort = getSortParams(req.query, ['createdAt', 'status', 'name']);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Contact.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, contacts, total, page, limit, 'Contacts fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/contacts/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw ApiError.notFound('Contact not found');

  // Mark as read
  if (contact.status === 'new') {
    contact.status = 'read';
    await contact.save();
  }

  return ApiResponse.success(res, contact, 'Contact fetched');
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/contacts/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateContact = asyncHandler(async (req, res) => {
  const allowed = ['status', 'adminNotes'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (updates.status === 'replied') updates.repliedAt = new Date();
  if (updates.status === 'closed') updates.closedAt = new Date();

  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!contact) throw ApiError.notFound('Contact not found');
  return ApiResponse.success(res, contact, 'Contact updated');
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/contacts/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (!contact) throw ApiError.notFound('Contact not found');
  return ApiResponse.success(res, null, 'Contact deleted');
});
