const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const routes = require('./routes/index.router');
const { v4: uuid } = require('uuid');
const { xss } = require('express-xss-sanitizer');
const Redis = require('ioredis');
const {
  logger,
  errorHandler,
  corsOptions,
  credentials,
  runWithContext,
} = require('@gaeservices/common');
const setupProxies = require('./proxies/index.proxies');

const app = express();
const isTest = process.env.NODE_ENV === 'test';
const SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';

app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdn.redocly.com',
          (_req, res) => `'nonce-${res.locals.nonce}'`,
        ],
        scriptSrcElem: [
          "'self'",
          'https://cdn.redocly.com',
          (_req, res) => `'nonce-${res.locals.nonce}'`,
        ],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'blob:', 'https://cdn.redocly.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Credentials & CORS
app.use(credentials);
app.use(cors(corsOptions));

// Parsing and sanitization
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(xss());

// Context block
app.use((req, _res, next) => {
  const ctx = {
    requestId: uuid(),
    service: SERVICE_NAME,
  };
  req._logCtx = ctx;
  if (typeof runWithContext === 'function') {
    runWithContext(ctx, next);
  } else {
    next();
  }
});

app.use((req, _res, next) => {
  if (req.user?.authId && req._logCtx) {
    // user will appear in subsequent logs
    req._logCtx.userId = req.user.authId;
  }
  next();
});

// Request logging
app.use((req, _res, next) => {
  logger.info(`Receive ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

const redisClient = isTest ? null : new Redis(process.env.REDIS_URL);

// Rate limiting
let ddosLimiter = (_req, _res, next) => next();
if (!isTest && redisClient) {
  // DDos protection and rate limiting
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1,
  });
  ddosLimiter = (req, res, next) => {
    rateLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many requests.',
        });
      });
  };
}
app.use(ddosLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.info(`→ ${req.method} ${req.url}`);
  logger.info(`Body: ${JSON.stringify(req.body)}`);
  next();
});

// Proxy setup
setupProxies(app);

// Serve all versions: /docs/openapi/v1/*, /docs/openapi/v2/*
app.use(
  '/docs/openapi',
  express.static(path.join(__dirname, 'docs', 'openapi'))
);

// Application routes
app.use('/', routes);

// catch-all 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling
app.use(errorHandler);

module.exports = app;
