const crypto = require('crypto');
const twilio = require('twilio');
const {
  findUserByEmailOrUsername,
  findUserByEmailOrPhone,
} = require('../models/auth.model');

const haveTwilio =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER;

const OTP_SALT = process.env.OTP_SALT || '';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendSMS = async (to, body) => {
  if (!haveTwilio) {
    // no-op in dev/test
    return { sid: 'mock', to, body };
  }
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
};

exports.sha256 = (s) => {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
};

exports.maskEmail = (email = '') => {
  const [u, d] = email.split('@');
  if (!u || !d) return email;
  const head = u.slice(0, 1);
  const tail = u.slice(-1);
  return `${head}***${tail}@${d}`;
};

exports.maskPhone = (phone = '') => {
  return phone.replace(/.(?=.{4})/g, '*');
};

exports.hashOTP = (otp, userId) => {
  return crypto
    .createHash('sha256')
    .update(`${otp}:${userId}:${OTP_SALT}`)
    .digest('hex');
};

exports.getUserForOTP = ({ username, email, phone }) => {
  if (username) {
    return findUserByEmailOrUsername(null, username);
  }
  if (email) {
    return findUserByEmailOrPhone(email, null);
  }
  return findUserByEmailOrPhone(null, phone);
};
