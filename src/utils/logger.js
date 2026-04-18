// src/utils/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf, metadata } = winston.format;

const logDir = process.env.LOG_DIR || 'logs';

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let log = `${ts} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0 && meta.metadata) {
    const cleanMeta = Object.fromEntries(
      Object.entries(meta.metadata).filter(([k]) => !['service'].includes(k))
    );
    if (Object.keys(cleanMeta).length > 0) log += ` ${JSON.stringify(cleanMeta)}`;
  }
  return log;
});

const fileTransportOptions = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
};

const transports = [
  new DailyRotateFile({
    ...fileTransportOptions,
    filename: path.join(logDir, 'error-%DATE%.log'),
    level: 'error',
  }),
  new DailyRotateFile({
    ...fileTransportOptions,
    filename: path.join(logDir, 'combined-%DATE%.log'),
  }),
];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'service-provider-api' },
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      ...fileTransportOptions,
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      ...fileTransportOptions,
      filename: path.join(logDir, 'rejections-%DATE%.log'),
    }),
  ],
});

module.exports = logger;
