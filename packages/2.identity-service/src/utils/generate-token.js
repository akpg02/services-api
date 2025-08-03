const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/token.model');

const generateTokens = async (res, user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '10m' } // change to 10m in production
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '1d' }
  );

  const expiresAt = new Date();

  // refresh token expires in 1 days
  expiresAt.setDate(expiresAt.getDate() + 1);

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  // Set the token in an HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
  });

  return { accessToken, refreshToken };
};

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports = { generateTokens, generateVerificationCode };
