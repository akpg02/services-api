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
const initPassport = require('./config/passport.config');
const { v4: uuid } = require('uuid');
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
const isTest = process.env.NODE_ENV === 'test';
const SERVICE_NAME = process.env.SERVICE_NAME || 'identity-service';

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

// passport
initPassport(app);

// Credentials & CORS
app.use(credentials);
app.use(cors(corsOptions));

// Parsing and sanitization
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
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

// IP based rate limiting for sensitive endpoints
const sensitiveEnpointRateLimit = isTest
  ? (_req, _res, next) => next()
  : rateLimit({
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

// apply this sensitive enpoints limiter
app.use('/auth/register', sensitiveEnpointRateLimit);

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

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
// error handler
app.use(errorHandler);

module.exports = app;
