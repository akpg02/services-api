const userDB = require('./user.mongo');

async function fetchAllUsers() {
  return userDB.find({});
}

async function fetchUserById(id) {
  return userDB.findById(id).populate({
    path: 'authId',
    match: { isActive: true },
    select: '-password -emailVerificationToken -passwordResetToken -__v',
  });
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

module.exports = {
  updateUser,
  deactivateUserId,
  findUserWithAuthId,
  fetchAllUsers,
  fetchUserById,
};
