const { generateTokens } = require('../../../utils/generate-token');

exports.oauthCallback = (_req, res) => {
  const { accessToken, refreshToken } = generateTokens();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
  });

  res.redirect(`/dashboard?token=${accessToken}`);
};
