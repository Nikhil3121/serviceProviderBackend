// src/jobs/queues.js
const { Queue, Worker, QueueEvents } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const emailService = require('../services/email.service');
const otpService = require('../services/otp.service');

let emailQueue = null;
let smsQueue = null;

const getConnection = () => {
  const client = getRedisClient();
  return {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    },
  };
};

// ── Queue Definitions ──────────────────────────────────────────────────────
const initQueues = () => {
  try {
    const conn = getConnection();

    emailQueue = new Queue('email', {
      ...conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    smsQueue = new Queue('sms', {
      ...conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 200 },
      },
    });

    logger.info('✅ BullMQ queues initialized');
    return { emailQueue, smsQueue };
  } catch (err) {
    logger.warn(`BullMQ init failed (app runs without queue): ${err.message}`);
    return { emailQueue: null, smsQueue: null };
  }
};

// ── Email Queue Jobs ───────────────────────────────────────────────────────
const EMAIL_JOBS = {
  SEND_VERIFICATION: 'sendVerification',
  SEND_WELCOME: 'sendWelcome',
  SEND_PASSWORD_RESET: 'sendPasswordReset',
  SEND_PASSWORD_CHANGED: 'sendPasswordChanged',
  SEND_CONTACT_NOTIFICATION: 'sendContactNotification',
  SEND_CONTACT_REPLY: 'sendContactReply',
};

// ── Email Worker ───────────────────────────────────────────────────────────
const initEmailWorker = () => {
  try {
    const conn = getConnection();
    const worker = new Worker(
      'email',
      async (job) => {
        logger.info(`Processing email job: ${job.name} [${job.id}]`);
        switch (job.name) {
          case EMAIL_JOBS.SEND_VERIFICATION:
            await emailService.sendVerificationEmail(job.data.user, job.data.url);
            break;
          case EMAIL_JOBS.SEND_WELCOME:
            await emailService.sendWelcomeEmail(job.data.user);
            break;
          case EMAIL_JOBS.SEND_PASSWORD_RESET:
            await emailService.sendPasswordResetEmail(job.data.user, job.data.url);
            break;
          case EMAIL_JOBS.SEND_PASSWORD_CHANGED:
            await emailService.sendPasswordChangedEmail(job.data.user);
            break;
          case EMAIL_JOBS.SEND_CONTACT_NOTIFICATION:
            await emailService.sendContactNotification(job.data);
            break;
          case EMAIL_JOBS.SEND_CONTACT_REPLY:
            await emailService.sendContactAutoReply(job.data);
            break;
          default:
            logger.warn(`Unknown email job: ${job.name}`);
        }
      },
      { ...conn, concurrency: 5 }
    );

    worker.on('completed', (job) => logger.info(`Email job completed: ${job.name} [${job.id}]`));
    worker.on('failed', (job, err) => logger.error(`Email job failed: ${job?.name} — ${err.message}`));
    worker.on('error', (err) => logger.error(`Email worker error: ${err.message}`));

    logger.info('✅ Email worker started');
    return worker;
  } catch (err) {
    logger.warn(`Email worker init failed: ${err.message}`);
    return null;
  }
};

// ── SMS Worker ────────────────────────────────────────────────────────────
const initSmsWorker = () => {
  try {
    const conn = getConnection();
    const worker = new Worker(
      'sms',
      async (job) => {
        logger.info(`Processing SMS job [${job.id}]: phone=${job.data.phone}`);
        await otpService.sendOTP(job.data.phone, job.data.otp);
      },
      { ...conn, concurrency: 10 }
    );

    worker.on('completed', (job) => logger.info(`SMS job completed [${job.id}]`));
    worker.on('failed', (job, err) => logger.error(`SMS job failed [${job?.id}]: ${err.message}`));

    logger.info('✅ SMS worker started');
    return worker;
  } catch (err) {
    logger.warn(`SMS worker init failed: ${err.message}`);
    return null;
  }
};

// ── Enqueue helpers ───────────────────────────────────────────────────────
const enqueueEmail = async (jobName, data, opts = {}) => {
  if (!emailQueue) {
    // Fallback: send directly
    logger.warn(`Queue unavailable, sending email directly: ${jobName}`);
    return;
  }
  return emailQueue.add(jobName, data, opts);
};

const enqueueSms = async (phone, otp, opts = {}) => {
  if (!smsQueue) {
    logger.warn(`Queue unavailable, sending SMS directly`);
    await otpService.sendOTP(phone, otp);
    return;
  }
  return smsQueue.add('sendOtp', { phone, otp }, opts);
};

module.exports = {
  initQueues,
  initEmailWorker,
  initSmsWorker,
  EMAIL_JOBS,
  enqueueEmail,
  enqueueSms,
  getEmailQueue: () => emailQueue,
  getSmsQueue: () => smsQueue,
};
