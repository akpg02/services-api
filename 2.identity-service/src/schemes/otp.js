const Joi = require('joi');

// E.164-ish: +15551234567 (7–15 digits, optional leading +)
const E164_RE = /^\+?[1-9]\d{6,14}$/;

// Reusable fields
const emailField = Joi.string().email().trim().lowercase();
const phoneField = Joi.string().pattern(E164_RE).trim().messages({
  'string.pattern.base':
    'Phone must be in international format (e.g. +15551234567)',
});
const usernameField = Joi.string().min(2).max(30).trim().lowercase();

// Allow OTP length via env, default 6 digits
const otpLen = Number.parseInt(process.env.OTP_LENGTH || '6', 10);
const otpField = Joi.string()
  .pattern(new RegExp(`^\\d{${otpLen}}$`))
  .required()
  .messages({
    'string.pattern.base': `OTP must be exactly ${otpLen} digits`,
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
    otp: otpField,
    email: emailField,
    phone: phoneField,
    username: usernameField,
  })
    .xor('email', 'phone', 'username')
    .messages({
      'object.xor': 'Provide exactly one of: email, phone, or username',
      'oject.missing': 'Provide one of: email, phone, or username',
    })
    .unknown(false);
  return scheme.validate(data, { abortEarly: false });
};

exports.verifyOTPScheme = (data) => {
  const scheme = Joi.object({
    otp: otpField,
    email: emailField,
    phone: phoneField,
    username: usernameField,
  })
    .xor('email', 'phone', 'username')
    .messages({
      'object.xor': 'Provide exactly one of: email, phone or username',
      'object.missing': 'Provide OTP and one of: email, phone or username',
    })
    .unknown(false);
  return scheme.validate(data, { abortEarly: false });
};
