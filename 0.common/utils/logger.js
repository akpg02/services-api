const { getContext } = require('./request-context');
const winston = require('winston');

const HIDE = '***REDACTED***';
const SENSITIVE_KEY_RE = /(pass(word)?|token|otp|secret|authorization)/i;

const contextFormat = winston.format((info) => {
  const ctx = getContext();
  if (ctx) Object.assign(info, ctx);
  return info;
});

function maskAuthorization(val) {
  if (typeof val !== 'string') return val;
  // Keep scheme, hide the credential
  return val.replace(/^(Basic|Bearer)\s+.+$/i, (_, s) => `${s} ${HIDE}`);
}

function redact(value, key = '') {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redact(v));
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // never log cookies at all
      if (k.toLowerCase() === 'cookie' || k.toLowerCase() === 'cookies')
        continue;

      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] =
          k.toLowerCase() === 'authorization'
            ? maskAuthorization(String(v))
            : HIDE;
      } else if (typeof v === 'object') {
        out[k] = redact(v, k);
      } else {
        out[k] = redact(v, k);
      }
    }
    return out;
  }

  // Primitive/string cases
  if (key.toLowerCase() === 'authorization')
    return maskAuthorization(String(value));
  return value;
}

// Winston format that redacts common places: message, meta, splat, etc.
const redactFormat = winston.format((info) => {
  // If message is an object, redact it
  if (info && typeof info.message === 'object') {
    info.message = redact(info.message);
  }

  // Redact top-level known fields often logged in web apps
  for (const k of ['body', 'headers', 'query', 'params', 'response', 'user']) {
    if (info[k]) info[k] = redact(info[k], k);
  }

  // Redact any extra metadata passed via splat (%o, %j)
  const splat = info[Symbol.for('splat')];
  if (Array.isArray(splat)) {
    info[Symbol.for('splat')] = splat.map((v) =>
      typeof v === 'object' ? redact(v) : v
    );
  }

  return info;
});

const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  defaultMeta: { service: process.env.SERVICE_NAME },

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    contextFormat(),
    redactFormat(),
    winston.format.json()
  ),

  transports: [
    new winston.transports.Console({
      level: isProd ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        redactFormat(), // ← and here for console output too
        winston.format.printf((info) => {
          // pretty, but still redacted
          const { timestamp, level, message, ...meta } = info;
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${timestamp} ${level}: ${
            typeof message === 'string' ? message : JSON.stringify(message)
          }${metaStr}`;
        })
      ),
    }),

    // File outputs stay JSON & redacted
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

module.exports = { logger };
