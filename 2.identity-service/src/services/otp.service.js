const Queue = require('bull');
const { sendSMS, hashOTP, maskEmail, maskPhone } = require('../utils/sms.utils');
const { generateVerificationCode } = require('../utils/generate-token.utils');
const { logger } = require('@gaeservices/common');

const emailQueue = new Queue('emailQueue');

/**
 * -via: 'sms' or 'email' (default 'email')
 * - hashes the code with hashOTP(code, user._id)
 * - sets otpExpires as a Date
 * @param {*} user
 * @param {*} param1
 * @returns
 */
async function issueLoginOTP(user, { via = 'email' } = {}) {
  const code = generateVerificationCode();

  user.otp = hashOTP(code, user._id);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateModifiedOnly: true });

  if (via === 'sms' && user.phone) {
    await sendSMS(user.phone, `Your OTP code is ${code}`);
    logger.info('OTP sent via SMS', { to: maskPhone(user.phone) });
    return { via: 'sms', destination: maskPhone(user.phone) };
  }

  // default to email
  await emailQueue.add('sendOTPEmail', { email: user.email, otpCode: code });
  return { via: 'email', destination: maskEmail(user.email) };
}

module.exports = { issueLoginOTP };
