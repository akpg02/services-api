const { logger } = require('@gaeservices/common');
const { generateTokens } = require('../../../utils/generate-token');
const { upsertOAuthUser } = require('../../../models/auth.model');
const {
  verifyGoogleIdToken,
  getGithubUser,
  getFacebookUser,
} = require('../../../services/oauth.service');

exports.oauthLogin = async (req, res) => {
  logger.info('POST /v1/auth/login/oauth');

  try {
    const { provider } = req.body;
    if (!provider) {
      return res
        .status(400)
        .json({ success: false, message: 'provider is required' });
    }

    let normalized;

    switch (provider) {
      case 'google': {
        const { idToken } = req.body;
        if (!idToken)
          return res.status(400).json({
            success: false,
            message: 'idToken is required for google',
          });

        normalized = await verifyGoogleIdToken(idToken, {
          expectedAudiences: [process.env.GOOGLE_CLIENT_ID],
          allowedIssuers: [
            'https://accounts.google.com',
            'accounts.google.com',
          ],
        });
        break;
      }

      case 'github': {
        const { accessToken } = req.body;
        if (!accessToken)
          return res.status(400).json({
            success: false,
            message: 'accessToken is required for github',
          });

        normalized = await getGithubUser(accessToken);
        break;
      }

      case 'facebook': {
        const { accessToken } = req.body;
        if (!accessToken)
          return res.status(400).json({
            success: false,
            message: 'accessToken is required for facebook',
          });

        normalized = await getFacebookUser(accessToken);
        break;
      }

      default:
        return res
          .status(400)
          .json({ success: false, message: 'Unsupported provider' });
    }

    // Upsert/link to your Auth + User models
    const { auth } = await upsertOAuthUser(normalized);

    // Issue cookies (refresh + access) — do not echo tokens if you're cookie-only
    await generateTokens(res, auth);

    return res
      .status(200)
      .json({ success: true, message: 'Logged in with OAuth' });
  } catch (err) {
    logger.error('OAuth token login error', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
