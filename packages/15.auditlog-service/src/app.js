const express = require('express');
const path = require('path');
const crypto = require('crypto');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const healthRoutes = require('./routes/v1/health/health.router');
const docsRoutes = require('./routes/v1/docs/docs.router');
const routes = require('./routes/v1/api');
const { auditHttp } = require('../src/middlewares/audit-http.middlewares');
const { v4: uuid } = require('uuid');
const { sanitize } = mongoSanitize;
const { xss } = require('express-xss-sanitizer');
const { RedisStore } = require('rate-limit-redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { rateLimit } = require('express-rate-limit');
const {
  errorHandler,
  logger,
  corsOptions,
  credentials,
  runWithContext,
} = require('@gaeservices/common');

const app = express();

const redisClient = new Redis(process.env.REDIS_URL);

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

// Context block
app.use((req, _res, next) => {
  const ctx = {
    requestId: uuid(),
    service: 'audit-log-service',
  };
  req._logCtx = ctx;
  runWithContext(ctx, next);
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

app.use(xss());

// DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
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
});

// Data sanitization against NoSQL query injection
app.use((req, _res, next) => {
  // 1) sanitize body & params by replacing the entire object
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  // 2) sanitize query _in place_ (so we never reassign req.query)
  for (const key of Object.keys(req.query || {})) {
    req.query[key] = sanitize(req.query[key]);
  }
  next();
});

// IP based rate limiting for sensitive endpoints
const sensitiveEnpointRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: 'Too many requests' });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// auto logs every HTTP request
app.use(auditHttp('api.request'));

// apply this sensitive enpoints limiter
app.use('/audit-logs', sensitiveEnpointRateLimit);

app.use(
  '/docs/openapi',
  express.static(path.join(__dirname, 'docs', 'openapi'))
);

// Swagger / ReDoc at GET /docs/*
app.use('/docs', docsRoutes);

// Health endpoint at GET /
app.use('/', healthRoutes);

// Routes
app.use(
  '/api/v1',
  (req, _res, next) => {
    req.redisClient = redisClient;
    next();
  },
  routes
);

// error handler
app.use(errorHandler);

module.exports = app;
