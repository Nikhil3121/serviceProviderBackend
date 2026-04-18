// src/services/email.service.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const emailTemplates = require('../templates/emails');

class EmailService {
  constructor() {
    this.transporter = null;
    this._init();
  }

  _init() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    if (process.env.NODE_ENV !== 'test') {
      this.transporter.verify((err) => {
        if (err) logger.warn(`SMTP verification failed: ${err.message}`);
        else logger.info('✅ SMTP transporter ready');
      });
    }
  }

  async _send({ to, subject, html, text }) {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Service Provider'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendVerificationEmail(user, verificationUrl) {
    const html = emailTemplates.verifyEmail({ name: user.name, verificationUrl });
    return this._send({
      to: user.email,
      subject: `Verify your email — ${process.env.APP_NAME}`,
      html,
    });
  }

  async sendWelcomeEmail(user) {
    const html = emailTemplates.welcome({ name: user.name });
    return this._send({
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME}! 🎉`,
      html,
    });
  }

  async sendPasswordResetEmail(user, resetUrl) {
    const html = emailTemplates.resetPassword({ name: user.name, resetUrl });
    return this._send({
      to: user.email,
      subject: `Password Reset Request — ${process.env.APP_NAME}`,
      html,
    });
  }

  async sendPasswordChangedEmail(user) {
    const html = emailTemplates.passwordChanged({ name: user.name });
    return this._send({
      to: user.email,
      subject: `Password Changed — ${process.env.APP_NAME}`,
      html,
    });
  }

  async sendContactNotification(contactData) {
    const html = emailTemplates.contactNotification(contactData);
    return this._send({
      to: process.env.ADMIN_EMAIL,
      subject: `📬 New Contact: ${contactData.subject || contactData.name} — ${process.env.APP_NAME}`,
      html,
    });
  }

  async sendContactAutoReply(contactData) {
    const html = emailTemplates.contactAutoReply(contactData);
    return this._send({
      to: contactData.email,
      subject: `We received your message — ${process.env.APP_NAME}`,
      html,
    });
  }
}

module.exports = new EmailService();
