const https = require('https');
const fetch = require('node-fetch');
const { OAuth2Client } = require('google-auth-library');
const { generateTokens } = require('../utils/generate-token.utils');
const { logger } = require('@gaeservices/common');

async function oauthCallback(req, res) {
  try {
    // req.user was set by passport strategy's done(null, user)
    const user = req.user;
    if (!user) {
      return res.redirect('/login?oauthError=missing_user');
    }

    await generateTokens(res, user);
    // set only cookies & redirect cleanly
    return res.redirect(302, process.env.OAUTH_SUCCESS_REDIRECT);
  } catch (err) {
    logger.error('OAuth callback error', err);
    return res.redirect(302, process.env.OAUTH_FAILURE_REDIRECT);
  }
}

// TODO: update your-app
// --- Strict TLS & sane timeouts
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
});

async function fetchJSON(
  url,
  { method = 'GET', headers = {}, body, timeoutMs = 5000 } = {}
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      agent: httpsAgent,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `HTTP ${res.status} ${res.statusText} for ${url}: ${text}`
      );
    }
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------- Google: verify ID token (aud + iss) ----------
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(
  idToken,
  {
    expectedAudiences = [process.env.GOOGLE_CLIENT_ID],
    allowedIssuers = ['https://accounts.google.com', 'accounts.google.com'],
  } = {}
) {
  // Library verifies signature, exp, iat, aud (we still double-check)
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: expectedAudiences,
  });
  const payload = ticket.getPayload();

  if (!allowedIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google issuer: ${payload.iss}`);
  }
  if (!expectedAudiences.includes(payload.aud)) {
    throw new Error(`Invalid Google audience: ${payload.aud}`);
  }

  return {
    provider: 'google',
    providerId: payload.sub,
    email: payload.email,
    emailVerified: !!payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
}

// ---------- GitHub: verify by calling provider APIs ----------
async function getGithubUser(accessToken) {
  const user = await fetchJSON('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'your-app',
      Accept: 'application/vnd.github+json',
    },
  });

  // emails endpoint to find primary verified email if /user.email is null
  let email = user.email;
  if (!email) {
    const emails = await fetchJSON('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'your-app',
        Accept: 'application/vnd.github+json',
      },
    });
    const primary = Array.isArray(emails)
      ? emails.find((e) => e.primary && e.verified) ||
        emails.find((e) => e.verified)
      : null;
    email = primary?.email || null;
  }

  return {
    provider: 'github',
    providerId: String(user.id),
    email,
    emailVerified: true, // only set true if you picked a verified email above
    name: user.name || user.login,
    picture: user.avatar_url,
  };
}

// ---------- Facebook: verify token first (app aud), then fetch user ----------
async function debugFacebookToken(userAccessToken) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appToken = `${appId}|${appSecret}`;

  const data = await fetchJSON(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      userAccessToken
    )}&access_token=${encodeURIComponent(appToken)}`
  );

  // Valid & issued for your app?
  if (!data?.data?.is_valid) throw new Error('Facebook token is invalid');
  if (data.data.app_id !== appId)
    throw new Error(`Facebook token app_id mismatch: ${data.data.app_id}`);

  return data.data;
}

async function getFacebookUser(accessToken) {
  // Verify token (incl. "audience" via app_id) BEFORE using it
  await debugFacebookToken(accessToken);

  const me = await fetchJSON(
    `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
      accessToken
    )}`
  );

  return {
    provider: 'facebook',
    providerId: me.id,
    email: me.email || null,
    emailVerified: !!me.email, // FB emails are verified when returned
    name: me.name,
    picture: me.picture?.data?.url,
  };
}

module.exports = {
  oauthCallback,
  verifyGoogleIdToken,
  getGithubUser,
  getFacebookUser,
};
