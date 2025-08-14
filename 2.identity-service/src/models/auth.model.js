const mongoose = require('mongoose');
const crypto = require('crypto');
const authDB = require('./auth.mongo');
const userDB = require('./user.mongo');

// ------- Config / helpers -------

const ALLOWED_PROVIDERS = new Set(['google', 'github', 'facebook']);

// Comma-separated list of allowed email domains. Empty means allow all.
const EMAIL_DOMAIN_ALLOWLIST = (process.env.ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const toLower = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : s);

function sanitizeUsername(base) {
  const cleaned = String(base || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  return cleaned || `user${Math.floor(Math.random() * 1e9)}`;
}

function domainAllowed(email) {
  if (!EMAIL_DOMAIN_ALLOWLIST.length || !email) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return EMAIL_DOMAIN_ALLOWLIST.includes(domain);
}

// Case-insensitive uniqueness for usernames; adds suffixes if needed
async function ensureUniqueUsername(username, session) {
  const base = sanitizeUsername(username);
  let candidate = base;
  let n = 0;

  // case-insensitive check using collation
  // loop is practically small in real life
  while (
    await authDB
      .findOne({ username: candidate })
      .collation({ locale: 'en', strength: 2 })
      .session(session)
  ) {
    n++;
    candidate = `${base}${n}`;
  }
  return candidate;
}

// If you still have legacy fields like googleId/githubId in the schema,
// this returns the field name. (Not required when using providers[])
function providerField(provider) {
  return `${provider}Id`;
}

/**
 * Optional mapper if you use Passport's profile object directly
 * (You should still verify the provider’s token server-side.)
 */
function profileToFields(provider, profile) {
  const email =
    Array.isArray(profile.emails) && profile.emails[0]?.value
      ? String(profile.emails[0].value).toLowerCase()
      : undefined;

  const candidateUsername = sanitizeUsername(
    email?.split('@')[0] ||
      profile.username ||
      profile.displayName ||
      `${provider}_${profile.id}`
  );

  const photo = Array.isArray(profile.photos)
    ? profile.photos[0]?.value
    : undefined;

  return {
    email,
    username: candidateUsername,
    firstname: profile.name?.givenName || undefined,
    avatar: photo,
    emailVerified: provider === 'google' ? true : !!email,
  };
}

// ------- Local registration / users -------

/**
 * registerUser
 * Creates Auth + User in a transaction. Password will be hashed by auth.mongo pre-save.
 * Accepts a canonical `verificationTokenExpiresAt`, but also supports your legacy typo’d keys.
 */
async function registerUser({
  email,
  username,
  password,
  phone,
  profile,
  emailVerificationToken,
  emailVerificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000),
}) {
  const session = await mongoose.startSession();
  let authDoc, userDoc;

  try {
    await session.withTransaction(
      async () => {
        const finalUsername = await ensureUniqueUsername(username, session);

        const authPayload = {
          email: toLower(email),
          username: finalUsername,
          password,
          phone,
          isActive: true,
          emailVerificationToken,
          emailVerificationTokenExpiresAt,
        };

        authDoc = (await authDB.create([authPayload], { session }))[0];

        userDoc = (
          await userDB.create([{ authId: authDoc._id, profile }], { session })
        )[0];
      },
      { writeConcern: { w: 'majority' } }
    );

    return { auth: authDoc, user: userDoc };
  } finally {
    session.endSession();
  }
}

async function findUserById(id) {
  return authDB.findById(id);
}

async function fetchInactiveUsers(thresholdDate) {
  return authDB.find({
    lastActiveAt: { $lt: thresholdDate },
    isActive: false,
  });
}

async function findUserByEmailOrUsername(
  email = null,
  username = null,
  extraFilters = {},
  { withPassword = false } = {}
) {
  if (!email && !username) {
    throw new Error('Must provide either an email or a username');
  }
  const idFilter = email
    ? { email: toLower(email) }
    : { username: toLower(username) };

  let q = authDB
    .findOne({ ...idFilter, ...extraFilters })
    .collation({ locale: 'en', strength: 2 });
  if (withPassword) q = q.select('+password');
  return q;
}

async function findUserByEmailOrPhone(
  email = null,
  phone = null,
  extraFilters = {}
) {
  if (!email && !phone) {
    throw new Error('Must provide either an email or a phone number');
  }
  const idFilter = email ? { email: toLower(email) } : { phone };
  return authDB
    .findOne({ ...idFilter, ...extraFilters })
    .collation({ locale: 'en', strength: 2 });
}

async function updateUserRole(id, role) {
  return authDB.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  );
}

async function deactivateAuthId(id, options = {}) {
  return authDB.findOneAndUpdate(
    { _id: id },
    { isActive: false },
    { new: true, session: options.session }
  );
}

async function findByVerificationToken(token) {
  return authDB.findOne({
    emailVerificationToken: token,
    emailVerificationTokenExpiresAt: { $gt: Date.now() },
  });
}

async function findByPasswordResetToken(token) {
  return authDB.findOne({
    passwordResetToken: token,
    passwordResetExpiresAt: { $gt: Date.now() },
  });
}

// ------- OAuth upsert/link -------

/**
 * upsertFromOAuth(normalized)
 * normalized = {
 *   provider: 'google'|'github'|'facebook',
 *   providerId: 'string',
 *   email?: 'a@b.com',
 *   emailVerified?: boolean,
 *   name?: string,
 *   picture?: string
 * }
 *
 * Flow:
 *  1) If a user already has this provider binding -> return it (update stronger email/emailVerified if learned).
 *  2) Else if email matches an existing user -> attach provider to that user (safe link).
 *  3) Else create a new Auth + User with a random password placeholder.
 */
async function upsertFromOAuth(normalized) {
  if (!normalized || !ALLOWED_PROVIDERS.has(normalized.provider)) {
    throw new Error('Unsupported or missing provider');
  }
  if (!normalized.providerId || typeof normalized.providerId !== 'string') {
    throw new Error('Invalid providerId');
  }
  if (normalized.email && !domainAllowed(normalized.email)) {
    throw new Error('Email domain not allowed');
  }

  const session = await mongoose.startSession();
  try {
    let authDoc, userDoc;
    await session.withTransaction(
      async () => {
        // 1) Already linked?
        authDoc = await authDB
          .findOne({
            providers: {
              $elemMatch: {
                provider: normalized.provider,
                providerId: normalized.providerId,
              },
            },
          })
          .session(session);

        if (authDoc) {
          const strongerVerify =
            normalized.emailVerified && !authDoc.emailVerified;
          if (strongerVerify || (normalized.email && !authDoc.email)) {
            authDoc.emailVerified = strongerVerify
              ? true
              : authDoc.emailVerified;
            authDoc.email = authDoc.email || normalized.email?.toLowerCase();
            await authDoc.save({ session, validateModifiedOnly: true });
          }
          userDoc = await userDB
            .findOne({ authId: authDoc._id })
            .session(session);
          return;
        }

        // 2) Attach by email if present
        if (normalized.email) {
          const existingByEmail = await authDB
            .findOne({ email: normalized.email.toLowerCase() })
            .collation({ locale: 'en', strength: 2 })
            .session(session);

          if (existingByEmail) {
            const alreadyBound = existingByEmail.providers.some(
              (p) => p.provider === normalized.provider
            );
            if (!alreadyBound) {
              existingByEmail.providers.push({
                provider: normalized.provider,
                providerId: normalized.providerId,
              });
            }
            if (normalized.emailVerified && !existingByEmail.emailVerified) {
              existingByEmail.emailVerified = true;
            }
            authDoc = await existingByEmail.save({
              session,
              validateModifiedOnly: true,
            });
            userDoc = await userDB
              .findOne({ authId: authDoc._id })
              .session(session);
            return;
          }
        }

        // 3) Create a new user
        const email = normalized.email
          ? normalized.email.toLowerCase()
          : undefined;

        const baseUsername = email
          ? email.split('@')[0]
          : normalized.name || normalized.providerId;

        const username = await ensureUniqueUsername(baseUsername, session);
        const randomPassword = crypto.randomBytes(24).toString('hex');

        authDoc = (
          await authDB.create(
            [
              {
                email,
                username,
                password: randomPassword, // OAuth-first; can set a local password later
                providers: [
                  {
                    provider: normalized.provider,
                    providerId: normalized.providerId,
                  },
                ],
                emailVerified: !!normalized.emailVerified,
                isActive: true,
              },
            ],
            { session }
          )
        )[0];

        userDoc = (
          await userDB.create(
            [
              {
                authId: authDoc._id,
                profile: {
                  firstname: normalized.name || undefined,
                  avatarids: normalized.picture ? [normalized.picture] : [],
                  bio: undefined,
                  preferences: {},
                },
              },
            ],
            { session }
          )
        )[0];
      },
      { writeConcern: { w: 'majority' } }
    );

    return { auth: authDoc, user: userDoc };
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      err.status = 409;
      err.message = `Duplicate ${field}.`;
    }
    throw err;
  } finally {
    session.endSession();
  }
}

// ------- Exports -------

module.exports = {
  // local
  registerUser,
  findUserById,
  fetchInactiveUsers,
  findUserByEmailOrUsername,
  findUserByEmailOrPhone,
  updateUserRole,
  deactivateAuthId,
  findByVerificationToken,
  findByPasswordResetToken,

  // oauth
  upsertFromOAuth,

  // optional utilities
  providerField,
  profileToFields,
};
