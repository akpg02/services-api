const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const docsRoutes = require('./routes/docs/docs.router');
const { xss } = require('express-xss-sanitizer');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const {
  logger,
  errorHandler,
  corsOptions,
  credentials,
} = require('@gaeservices/common');
const setupProxies = require('./proxies/index.proxies');
const routes = require('./routes/index.router');

const app = express();
const redisClient = new Redis(process.env.REDIS_URL);

app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet.contentSecurityPolicy({
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
      connectSrc: ["'self'", 'blob:'],
    },
  })
);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Credentials & CORS
app.use(credentials);
app.use(cors(corsOptions));

// Parsing and sanitization
app.use(express.json());
app.use(cookieParser());
app.use(xss());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: 'Too many requests' });
    },
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  })
);

// Request logging
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.url}`);
  logger.info(`Body: ${JSON.stringify(req.body)}`);
  next();
});

// Proxy setup
setupProxies(app);

app.use(
  '/docs/openapi',
  express.static(path.join(__dirname, 'docs', 'openapi'))
);

app.use('/docs', docsRoutes);

// Application routes
app.use('/', routes);

// catch-all 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling
app.use(errorHandler);

module.exports = app;
