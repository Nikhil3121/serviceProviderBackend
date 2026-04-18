// src/config/database.js
'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // ── Guard: catch missing URI early with a clear message ──────────────────
  if (!uri) {
    logger.error(
      'MONGODB_URI is not set. ' +
      'Add it to your .env file.\n' +
      '  Local:  MONGODB_URI=mongodb://localhost:27017/service-provider-dev\n' +
      '  Atlas:  MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/dbname'
    );
    process.exit(1);
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed (app termination)');
      process.exit(0);
    });
  } catch (error) {
    // Log the full error string so Winston always surfaces it regardless of format
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
