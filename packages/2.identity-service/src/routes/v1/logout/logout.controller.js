const { fetchToken, deleteToken } = require('../../../models/token.model');
const { logger } = require('@gaeservices/common');

exports.logout = async (req, res) => {
  // Note: On client, also delete the accessToken
  logger.info('Logout endpooint');
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(204); // no content

    const refreshToken = cookies.refreshToken;

    const storedToken = await fetchToken(refreshToken);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return res.sendStatus(204);
    }

    await deleteToken(refreshToken);
    logger.info('Refresh token deleted for logout');

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res.sendStatus(204);
  } catch (error) {
    logger.error('Registration error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
