// src/services/otp.service.js
const axios = require('axios');
const bcrypt = require('bcryptjs');
const OTP = require('../models/OTP');
const logger = require('../utils/logger');
const { generateOTP } = require('../utils/helpers');

class OTPService {
  constructor() {
    this.twilioClient = null;
    this._initTwilio();
  }

  _initTwilio() {
    if (
      process.env.SMS_PROVIDER === 'twilio' &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        logger.info('✅ Twilio initialized');
      } catch (e) {
        logger.warn('Twilio init failed — SMS disabled');
      }
    }
  }

  async generateAndStore(userId, phone, purpose = 'phone-verification') {
    // Invalidate previous OTPs for this phone+purpose
    await OTP.updateMany(
      { phone, purpose, isUsed: false },
      { $set: { isUsed: true } }
    );

    const otpLength = parseInt(process.env.OTP_LENGTH, 10) || 6;
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const rawOtp = generateOTP(otpLength);

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await OTP.create({
      phone,
      userId,
      otp: hashedOtp,
      purpose,
      expiresAt,
    });

    logger.info(`OTP generated for ${phone} [${purpose}]`);
    return rawOtp;
  }

  async verifyOTP(phone, rawOtp, purpose = 'phone-verification') {
    const record = await OTP.findOne({
      phone,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return { success: false, message: 'OTP expired or not found. Please request a new one.' };
    }

    if (record.attempts >= 5) {
      await record.updateOne({ isUsed: true });
      return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    const isMatch = await bcrypt.compare(rawOtp, record.otp);
    if (!isMatch) {
      await record.updateOne({ $inc: { attempts: 1 } });
      return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    await record.updateOne({ isUsed: true });
    return { success: true, message: 'OTP verified successfully' };
  }

  async sendOTP(phone, otp) {
    const provider = process.env.SMS_PROVIDER || 'twilio';

    try {
      if (provider === 'fast2sms') {
        return await this._sendFast2SMS(phone, otp);
      }
      return await this._sendTwilio(phone, otp);
    } catch (error) {
      logger.error(`SMS send failed [${provider}]:`, error.message);
      // In development: log OTP instead of failing
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[DEV] OTP for ${phone}: ${otp}`);
        return { success: true, devMode: true };
      }
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  async _sendTwilio(phone, otp) {
    if (!this.twilioClient) throw new Error('Twilio not configured');
    const message = await this.twilioClient.messages.create({
      body: `[${process.env.APP_NAME}] Your verification code is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`OTP sent via Twilio to ${phone}: ${message.sid}`);
    return { success: true, sid: message.sid };
  }

  async _sendFast2SMS(phone, otp) {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'otp',
        variables_values: otp,
        flash: 0,
        numbers: phone.replace('+91', ''),
      },
      {
        headers: { authorization: process.env.FAST2SMS_API_KEY },
        timeout: 10000,
      }
    );

    if (!response.data.return) throw new Error('Fast2SMS delivery failed');
    logger.info(`OTP sent via Fast2SMS to ${phone}`);
    return { success: true };
  }
}

module.exports = new OTPService();
