const userDB = require('./user.mongo');

async function updateUser(id, updates) {
  return await userDB.findOneAndUpdate({ authId: id }, updates, { new: true });
}

async function deactivateUserId(authId, options = {}) {
  await userDB.findOneAndUpdate(
    authId,
    { isActive: false },
    { new: true, session: options.session }
  );
}

async function findUserWithAuthId(authId, { includeRole = false } = {}) {
  const excludeFields = [
    '-password',
    '-emailVerificationToken',
    '-isActive',
    '-lastActiveAt',
    '-emailVerified',
    '-passwordResetExpiresAt',
  ];

  if (!includeRole) {
    excludeFields.push('-role');
  }
  return userDB
    .findOne({ authId })
    .populate({ path: 'authId', select: excludeFields.join(' ') });
}

module.exports = { updateUser, deactivateUserId, findUserWithAuthId };
