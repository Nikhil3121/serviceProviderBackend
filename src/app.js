// src/app.js
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const hpp = require('hpp');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const routes = require('./routes/index');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const logger = require('./utils/logger');

const app = express();

// ── Trust proxy (for Nginx / cloud load balancers) ────────────────────────
app.set('trust proxy', 1);

// ── Security Headers (Helmet) ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com', 'https://www.gstatic.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", 'https://www.google.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-captcha-token'],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  })
);

// ── Compression ───────────────────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Data Sanitization ─────────────────────────────────────────────────────
app.use(mongoSanitize()); // NoSQL injection protection
app.use(xss());           // XSS protection
app.use(hpp({             // HTTP Parameter Pollution protection
  whitelist: ['sort', 'limit', 'page', 'fields', 'category', 'tags'],
}));

// ── HTTP Request Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(':method :url :status :response-time ms - :res[content-length]', {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: (req) => req.url === '/api/v1/health',
    })
  );
}

// ── Global Rate Limiter ───────────────────────────────────────────────────
app.use(globalLimiter);

// ── API Documentation ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Service Provider API Docs',
      swaggerOptions: { persistAuthorization: true },
    })
  );
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  logger.info('📚 Swagger docs available at /api/docs');
}

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Root ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME || 'Service Provider'} API`,
    version: '1.0.0',
    docs: process.env.NODE_ENV !== 'production' ? '/api/docs' : undefined,
    health: '/api/v1/health',
  });
});

// ── 404 & Error Handlers ──────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
