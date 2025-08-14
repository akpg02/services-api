const Joi = require('joi');

// E.164-ish: +15551234567 (7–15 digits, optional leading +)
const E164_RE = /^\+?[1-9]\d{6,14}$/;
// Strip unknown keys by default (set STRIP_UNKNOWN=false to disable)
const STRIP_UNKNOWN =
  (process.env.STRIP_UNKNOWN ?? 'true').toLowerCase() !== 'false';

// Allow emails without a TLD in dev/test (e.g. "user@local")
// Set ALLOW_TLDLESS_EMAILS=true if you want this behavior
const ALLOW_TLDLESS =
  (process.env.ALLOW_TLDLESS_EMAILS || '').toLowerCase() === 'true';

// Reusable fields
const rememberDevice = Joi.boolean().optional();
const deviceLabel = Joi.string().max(64).optional();
const emailField = (
  ALLOW_TLDLESS
    ? Joi.string().email({ tlds: { allow: false } })
    : Joi.string().email()
)
  .trim()
  .lowercase();
const phoneField = Joi.string().pattern(E164_RE).trim().messages({
  'string.pattern.base':
    'Phone must be in international format (e.g. +15551234567)',
});
const usernameField = Joi.string().min(2).max(30).trim().lowercase();

const JOI_OPTS = { abortEarly: false, stripUnknown: STRIP_UNKNOWN };

// Allow OTP length via env, default 6 digits
const envLen = Number.parseInt(process.env.OTP_LENGTH || '6', 10);
const safeLen = Number.isFinite(envLen) ? Math.min(10, Math.max(4, envLen)) : 6;

const otpField = Joi.string()
  .pattern(new RegExp(`^\\d{${safeLen}}$`))
  .required()
  .messages({
    'string.pattern.base': `OTP must be exactly ${safeLen} digits`,
    'any.required': 'OTP is required',
  });
/**
 * Send OTP
 * Accept exactly ONE of: email | phone | username
 * (If username is used, the controller should look up the user and decide
 * whether to deliver by email or SMS based on what’s on file.)
 */
exports.sendOTPSchema = (data) => {
  const scheme = Joi.object({
    email: emailField,
    phone: phoneField,
    username: usernameField,
  })
    .xor('email', 'phone', 'username')
    .messages({
      'object.xor': 'Provide exactly one of: email, phone, or username',
      'oject.missing': 'Provide one of: email, phone, or username',
    });
  return scheme.validate(data, JOI_OPTS);
};

exports.verifyOTPScheme = (data) => {
  const scheme = Joi.object({
    otp: otpField,
    email: emailField,
    phone: phoneField,
    username: usernameField,
    rememberDevice,
    deviceLabel,
  })
    .xor('email', 'phone', 'username')
    .messages({
      'object.xor': 'Provide exactly one of: email, phone or username',
      'object.missing': 'Provide OTP and one of: email, phone or username',
    });
  return scheme.validate(data, JOI_OPTS);
};
