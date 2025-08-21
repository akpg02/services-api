// src/services/audit.service.js
const crypto = require('crypto');
const auditDB = require('../models/audit.mongo');

// ---------- Redaction helpers ----------
const HIDE = '***REDACTED***';
const SENSITIVE_KEY_RE =
  /(pass(word)?|token|otp|secret|authorization|cookie|set-cookie)/i;

function maskAuthorization(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/^(Basic|Bearer)\s+.+$/i, (_, s) => `${s} ${HIDE}`);
}

function redact(value, key = '') {
  if (value == null) return value;

  if (Array.isArray(value)) return value.map((v) => redact(v));

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
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

  // primitive/string
  if (key.toLowerCase() === 'authorization')
    return maskAuthorization(String(value));
  return value;
}

// ---------- Hashing helpers (for emails/phones) ----------
const SALT = process.env.AUDIT_HASH_SALT || 'CHANGE_ME_IN_ENV';
function sha256(data) {
  return crypto
    .createHash('sha256')
    .update(SALT + String(data))
    .digest('hex');
}
function hashTarget({ email, phone }) {
  const out = {};
  if (email) out.emailHash = `sha256:${sha256(email.trim().toLowerCase())}`;
  if (phone) out.phoneHash = `sha256:${sha256(phone.replace(/\D/g, ''))}`;
  return out;
}

// ---------- Payload summaries ----------
function summarizePayload(obj) {
  if (!obj) return undefined;
  const redacted = redact(obj);
  const json = JSON.stringify(redacted);
  return {
    bytes: Buffer.byteLength(json, 'utf8'),
    hash: `sha256:${sha256(json)}`,
    // keep only the top-level field names for quick glance
    fields: Array.isArray(redacted) ? [] : Object.keys(redacted || {}),
  };
}

// ---------- Normalizers for channel-specific inputs ----------
function normalizeHttp(http = {}, resStatusCode) {
  const out = {};
  if (http.method) out.method = String(http.method).toUpperCase();
  if (http.path) out.path = http.path;
  if (http.statusCode || resStatusCode)
    out.statusCode = http.statusCode ?? resStatusCode;
  if (http.requestSize != null) out.requestSize = http.requestSize;
  if (http.responseSize != null) out.responseSize = http.responseSize;
  return Object.keys(out).length ? out : undefined;
}

function normalizeMq(mq = {}) {
  const allowed = [
    'system',
    'topic',
    'queue',
    'routingKey',
    'partition',
    'messageId',
    'retryCount',
    'dlq',
  ];
  const out = {};
  for (const k of allowed) if (mq[k] != null) out[k] = mq[k];
  return Object.keys(out).length ? out : undefined;
}

function normalizeNotif(notif = {}) {
  const out = {};
  if (notif.channel) out.channel = notif.channel; // email|sms|push
  if (notif.provider) out.provider = notif.provider;
  if (notif.templateId) out.templateId = notif.templateId;
  const target = {
    ...hashTarget({ email: notif.email, phone: notif.phone }),
    userId: notif.userId,
  };
  if (Object.keys(target).length) out.target = target;
  if (notif.messageId) out.messageId = notif.messageId;
  return Object.keys(out).length ? out : undefined;
}

function normalizeWebhook(webhook = {}) {
  const allowed = [
    'url',
    'event',
    'deliveryId',
    'signatureHash',
    'statusCode',
    'latencyMs',
  ];
  const out = {};
  for (const k of allowed) if (webhook[k] != null) out[k] = webhook[k];
  return Object.keys(out).length ? out : undefined;
}

// ---------- Public API ----------
/**
 * Create a normalized, redacted audit log entry.
 * @param {Object} input - mixed fields (see examples below)
 * @returns {Promise<Object>} created log (plain object)
 */
async function createAuditLog(input = {}) {
  // Base mapping
  const doc = {
    service: input.service,
    action: input.action,
    actor: input.actor, // { type: 'user'|'service', id: '...' }
    resource: input.resource, // { type: 'user'|'order'|..., id: '...' }
    channel: input.channel, // 'http'|'mq'|'email'|'sms'|'push'|'webhook'|'job'|'admin'
    direction: input.direction || 'internal',
    status: input.status || 'success',
    statusCode: input.statusCode,
    reason: input.reason,
    requestId: input.requestId,
    correlationId: input.correlationId,
    latencyMs: input.latencyMs,
    ip: input.ip,
    userAgent: input.userAgent,
    // channel details
    http: normalizeHttp(input.http, input.statusCode),
    mq: normalizeMq(input.mq),
    notif: normalizeNotif(input.notif),
    webhook: normalizeWebhook(input.webhook),
    // summaries (never store raw bodies here)
    requestSummary: summarizePayload(input.request),
    responseSummary: summarizePayload(input.response),
    meta: redact(input.meta || {}),
  };

  // Clean empties so minimize:true does its job
  Object.keys(doc).forEach(
    (k) =>
      (doc[k] == null ||
        (typeof doc[k] === 'object' && !Object.keys(doc[k] || {}).length)) &&
      delete doc[k]
  );

  const created = await auditDB.create(doc);
  return created.toObject();
}

module.exports = {
  createAuditLog,
  redact,
  summarizePayload,
  hashTarget,
};
