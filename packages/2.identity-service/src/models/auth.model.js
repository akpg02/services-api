const { default: mongoose } = require('mongoose');
const authDB = require('./auth.mongo');
const userDB = require('./user.mongo');

async function registerUser({
  email,
  username,
  password,
  phone,
  profile,
  emailVerificationToken,
  verifcationTokenExpiresAt,
}) {
  const session = await mongoose.startSession();
  let authDoc, userDoc;

  try {
    await session.withTransaction(async () => {
      authDoc = await authDB.create(
        [
          {
            email,
            username,
            password,
            phone,
            isActive: true,
            emailVerificationToken,
            verifcationTokenExpiresAt,
          },
        ],
        { session }
      );
      authDoc = authDoc[0];

      userDoc = await userDB.create([{ authId: authDoc.id, profile }], {
        session,
      });
      userDoc = userDoc[0];
    });
    return { auth: authDoc, user: userDoc };
  } finally {
    session.endSession();
  }
}

async function findUserById(id) {
  return authDB.findById(id);
}

async function findUserByEmailOrUsername(
  email = null,
  username = null,
  extraFilters = {}
) {
  if (!email && !username) {
    throw new Error('Must provide either an email or a username');
  }
  const idFilter = email ? { email } : { username };
  return authDB.findOne({ ...idFilter, ...extraFilters });
}

async function findUserByEmailOrPhone(
  email = null,
  phone = null,
  extraFilters = {}
) {
  if (!email && !phone) {
    throw new Error('Must provide either an email or a phone number');
  }
  const idFilter = email ? { email } : { phone };
  return authDB.findOne({ ...idFilter, ...extraFilters });
}

async function deactivateAuthId(id, options = {}) {
  await authDB.findOneAndUpdate(
    { _id: id },
    { isActive: false },
    { new: true, session: options.session }
  );
}

async function findByVerificationToken(token) {
  return authDB.findOne({
    emailVerificationToken: token,
    verifcationTokenExpiresAt: { $gt: Date.now() },
  });
}

async function findByPasswordResetToken(token) {
  return authDB.findOne({
    passwordResetToken: token,
    passwordResetExpiresAt: { $gt: Date.now() },
  });
}

module.exports = {
  registerUser,
  findUserById,
  deactivateAuthId,
  findUserByEmailOrPhone,
  findUserByEmailOrUsername,
  findByVerificationToken,
  findByPasswordResetToken,
};
