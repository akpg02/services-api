require('dotenv').config();
const ApiFeatures = require('./utils/api.features');
const { logger } = require('./utils/logger');
const { runWithContext, getContext } = require('./utils/request-context');
const { auditLogger } = require('./middlewares/audit.logger');
const { authenticateRequest, restrictTo } = require('./middlewares/auth');
const { errorHandler } = require('./middlewares/error.handler');
const { credentials } = require('./middlewares/credentials');
const { invalidateCache } = require('./utils/cache/redis.cache');
const { corsOptions } = require('./config/cors.options');
const {
  firstLetterUppercase,
  lowerCase,
  toUpperCase,
  isEmail,
  isDataURL,
} = require('./utils/helpers');
const {
  connectToRabbitMQ,
  getConnection,
  getChannel,
  publishEvent,
  consumeEvent,
  sendRPCRequest,
  registerRPCHandler,
} = require('./rabbitmq/rabbitmq');

module.exports = {
  ApiFeatures,
  logger,
  corsOptions,
  credentials,
  connectToRabbitMQ,
  getConnection,
  getChannel,
  consumeEvent,
  publishEvent,
  firstLetterUppercase,
  lowerCase,
  toUpperCase,
  isEmail,
  isDataURL,
  sendRPCRequest,
  registerRPCHandler,
  auditLogger,
  authenticateRequest,
  restrictTo,
  errorHandler,
  invalidateCache,
  runWithContext,
  getContext,
};
