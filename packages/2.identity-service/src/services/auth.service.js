const Auth = require('../models/auth.model');

const getUserByUsername = async (username) => {
  return await Auth.findOne({ username }).select('-emailVerificationToken');
};

const getUserByEmail = async (email) => {
  return await Auth.findOne({ email }).select('-emailVerificationToken');
};

module.exports = { getUserByEmail, getUserByUsername };
