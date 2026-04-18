// src/models/OTP.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['phone-verification', 'login', 'password-reset'],
      default: 'phone-verification',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index — MongoDB auto-deletes expired documents
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

// Compound index for efficient lookup
otpSchema.index({ phone: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ userId: 1, purpose: 1 });

const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP;
