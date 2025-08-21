// src/utils/trusted-device.utils.js
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const TrustedDevice = require('../models/trusted-device.mongo');
const { logger } = require('@gaeservices/common');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const SECRET = process.env.TRUSTED_DEVICE_SECRET || 'dev-secret';
const TTL_DAYS = parseInt(process.env.TRUSTED_DEVICE_TTL_DAYS || '30', 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const COOKIE_NAME_TOKEN = 'td'; // HttpOnly opaque token
const COOKIE_NAME_DEVICE = 'tdid'; // public device id (non-sensitive)

/** HMAC-SHA256 */
function hmac(val) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(String(val || ''))
    .digest('hex');
}

/** Short UA fingerprint (you can relax/normalize this if you want to be less strict) */
function userAgentFingerprint(req) {
  return hmac(req.get('user-agent') || '');
}

/** Get cookies (assumes cookie-parser is mounted) */
function getCookies(req) {
  const cookies = req.cookies || {};
  return {
    token: cookies[COOKIE_NAME_TOKEN],
    deviceId: cookies[COOKIE_NAME_DEVICE],
  };
}

/** Set both cookies */
function setTrustedCookies(res, { token, deviceId, expiresAt }) {
  const cookieOptsBase = {
    sameSite: 'lax',
    secure: isProd,
    domain: COOKIE_DOMAIN || undefined,
    expires: expiresAt,
  };

  // public device id (not sensitive – may be readable by client code if you prefer)
  res.cookie(COOKIE_NAME_DEVICE, deviceId, {
    ...cookieOptsBase,
    httpOnly: false,
  });

  // httpOnly secret token
  res.cookie(COOKIE_NAME_TOKEN, token, {
    ...cookieOptsBase,
    httpOnly: true,
  });
}

/** Clear cookies (e.g., on revoke all) */
function clearTrustedCookies(res) {
  const opts = {
    sameSite: 'lax',
    secure: isProd,
    domain: COOKIE_DOMAIN || undefined,
  };
  res.clearCookie(COOKIE_NAME_DEVICE, opts);
  res.clearCookie(COOKIE_NAME_TOKEN, { ...opts, httpOnly: true });
}

/**
 * Create/refresh a trusted-device record and set cookies.
 * Call this AFTER a successful OTP verification when `rememberDevice===true`.
 */
async function rememberTrustedDevice(user, req, res, { label } = {}) {
  const deviceId = getCookies(req).deviceId || uuid();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hmac(token);
  const uaHash = userAgentFingerprint(req);
  const expiresAt = new Date(Date.now() + TTL_DAYS * MS_PER_DAY);

  // upsert by (user, deviceId)
  const existing = await TrustedDevice.findOne({ user: user._id, deviceId });

  if (existing) {
    existing.tokenHash = tokenHash;
    existing.uaHash = uaHash;
    existing.expiresAt = expiresAt;
    existing.revokedAt = null;
    if (label) existing.label = label;
    existing.lastUsedAt = new Date();
    await existing.save({ validateModifiedOnly: true });
  } else {
    await TrustedDevice.create({
      user: user._id,
      deviceId,
      tokenHash,
      uaHash,
      label,
      ipAtIssue: req.ip,
      expiresAt,
      revokedAt: null,
    });
  }

  setTrustedCookies(res, { token, deviceId, expiresAt });
  logger.info(`Trusted device saved for user=${user._id} deviceId=${deviceId}`);
  return { deviceId, expiresAt };
}

/**
 * Verify cookies against a trusted-device record.
 * Returns { ok: boolean, device?: TrustedDevice }
 */
async function verifyTrustedDevice(userId, req) {
  const { token, deviceId } = getCookies(req);
  if (!token || !deviceId) return { ok: false, reason: 'missing_cookie' };

  const device = await TrustedDevice.findOne({
    user: userId,
    deviceId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!device) return { ok: false, reason: 'not_found_or_expired' };

  const tokenHash = hmac(token);
  const uaHashNow = userAgentFingerprint(req);

  if (tokenHash !== device.tokenHash) return { ok: false, reason: 'bad_token' };
  if (uaHashNow !== device.uaHash) return { ok: false, reason: 'ua_mismatch' };

  // update last-used (don’t await to avoid adding latency; but safe to await too)
  device.lastUsedAt = new Date();
  device.ipAtIssue = device.ipAtIssue || req.ip;
  device.save({ validateModifiedOnly: true }).catch(() => {});

  return { ok: true, device };
}

/** Optional helpers for management endpoints */
async function revokeDevice(userId, deviceId) {
  return TrustedDevice.findOneAndUpdate(
    { user: userId, deviceId },
    { revokedAt: new Date() },
    { new: true }
  );
}

async function revokeAllDevices(userId) {
  return TrustedDevice.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

module.exports = {
  rememberTrustedDevice,
  verifyTrustedDevice,
  revokeDevice,
  revokeAllDevices,
  clearTrustedCookies,
};
