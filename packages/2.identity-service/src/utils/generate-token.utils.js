const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/token.model');

const isProd = process.env.NODE_ENV === 'production';

function setAuthCookies(res, accessToken, refreshToken) {
  // short-lived access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
  });

  // refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/auth',
    maxAge: 24 * 60 * 60 * 10000, // 1day
  });
}
const generateTokens = async (res, user) => {
  const payload = {
    sub: String(user._id),
    username: user.username,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '10m' } // change to 10m in production
  );

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '1d',
  });

  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token: tokenHash,
    user: user._id,
    expiresAt,
  });

  // Set the token in an HTTP-only cookie
  setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken };
};

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports = { generateTokens, generateVerificationCode };
