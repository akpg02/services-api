const mongoose = require('mongoose');
const { logger } = require('../../../0.common/utils/logger');

const connectToDB = () =>
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch((e) => logger.error('MongoDB connection error', e));

module.exports = { connectToDB };
