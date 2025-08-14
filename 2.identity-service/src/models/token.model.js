const refreshTokenDB = require('./token.mongo');

async function fetchToken(token) {
  return await refreshTokenDB.findOne({ token });
}

async function deleteToken(token) {
  await refreshTokenDB.deleteOne({ token });
}

async function deleteAllUserTokens(id) {
  await refreshTokenDB.deleteMany({ user: id });
}

module.exports = { fetchToken, deleteToken, deleteAllUserTokens };
