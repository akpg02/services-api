const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
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

// Security headers
app.use(helmet());

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

// Application routes
app.use('/', routes);

// catch-all 404 handler
app.use((_req, res, _next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling
app.use(errorHandler);

module.exports = app;
