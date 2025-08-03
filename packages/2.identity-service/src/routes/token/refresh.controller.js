const RefreshToken = require('../../models/token.model');
const Auth = require('../.././models/auth.model');
const jwt = require('jsonwebtoken');
const { logger } = require('@gaeservices/common');
const { generateTokens } = require('../../utils/generate-token');

exports.refreshToken = async (req, res) => {
  logger.info('Refresh token endpoint');
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken)
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized' });

    const refreshToken = cookies.refreshToken;

    // clear existing token
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired refresh token');
      return res
        .status(401)
        .json({ success: false, message: 'Invalid or expired refresh token' });
    }
    const user = await Auth.findById(storedToken.user);
    if (!user) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          if (err)
            return res
              .status(403)
              .json({ success: false, message: 'Forbidden' });
          const hackedUser = await Auth.findOne({
            username: decoded.username,
          }).exec();
          await RefreshToken.deleteMany({ user: hackedUser._id });

          return res
            .status(401)
            .json({ success: false, message: 'User no longer exists' });
        }
      );
      return;
    }

    const { accessToken: newAccessToken } = await generateTokens(res, user);

    // delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    logger.error('Refresh token error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
