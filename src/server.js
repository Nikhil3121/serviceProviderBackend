// src/server.js
'use strict';

// Load environment variables FIRST
require('dotenv').config();

// ── Startup environment guard ────────────────────────────────────────────────
// Catches missing critical vars before any module tries to use them.
const REQUIRED_ENV = [
  { key: 'MONGODB_URI',         hint: 'mongodb://localhost:27017/service-provider-dev' },
  { key: 'JWT_ACCESS_SECRET',   hint: 'run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"' },
  { key: 'JWT_REFRESH_SECRET',  hint: 'same as above — use a DIFFERENT value' },
];

const missing = REQUIRED_ENV.filter(({ key }) => !process.env[key]);
if (missing.length > 0) {
  console.error('\n❌  Missing required environment variables — server cannot start.\n');
  missing.forEach(({ key, hint }) =>
    console.error(`   ${key}\n      → ${hint}\n`)
  );
  console.error('   Add these to your .env file and restart.\n');
  process.exit(1);
}

const app = require('./app');
const connectDB = require('./config/database');
const { getRedisClient } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

let server;

const startServer = async () => {
  try {
    // ── Database ──────────────────────────────────────────────────────────
    await connectDB();

    // ── Redis (non-blocking — app runs without it) ────────────────────────
    const redis = getRedisClient();
    redis.connect().catch((err) => {
      logger.warn(`Redis unavailable (app will run without cache): ${err.message}`);
    });

    // ── HTTP Server ───────────────────────────────────────────────────────
    server = app.listen(PORT, HOST, () => {
      const env = (process.env.NODE_ENV || 'development').padEnd(36);
      const base = `http://${HOST}:${PORT}`;
      logger.info(`
╔══════════════════════════════════════════════════════╗
║         Service Provider Backend — Running           ║
╠══════════════════════════════════════════════════════╣
║  Environment : ${env}║
║  URL         : ${base.padEnd(36)}║
║  API Base    : ${(base + '/api/v1').padEnd(36)}║
${process.env.NODE_ENV !== 'production'
  ? `║  Docs        : ${(base + '/api/docs').padEnd(36)}║\n`
  : ''}╚══════════════════════════════════════════════════════╝
      `);
    });

    server.timeout = 30_000;

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      } catch (e) {
        logger.error(`Error closing MongoDB: ${e.message}`);
      }
      process.exit(0);
    });

    // Force close after 10 s
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  gracefulShutdown('unhandledRejection');
});

startServer();
