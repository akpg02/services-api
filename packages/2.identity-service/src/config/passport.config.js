const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const Auth = require('../models/auth');

async function handleOAuth(profile, provider, done) {
  try {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(null, false, {
        message: 'No email provided by OAuth provider',
      });
    }

    // Find user by email
    const user = await Auth.findOne({ email });
    if (!user) {
      return done(null, false, {
        message: 'No account found. Please register first.',
      });
    }

    // If provider ID not linked, update it
    const providerKey = `${provider}Id`;
    if (!user[providerKey]) {
      user[providerKey] = profile.id;
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}

// Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (profile, done) => handleOAuth(profile, 'google', done)
  )
);

// Facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'displayName'],
    },
    (profile, done) => handleOAuth(profile, 'facebook', done)
  )
);

// GitHub
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    },
    (profile, done) => handleOAuth(profile, 'github', done)
  )
);

module.exports = passport;
