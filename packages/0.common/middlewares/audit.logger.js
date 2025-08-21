// common/middlewares/auditLogger.js
const { publishEvent } = require('../rabbitmq/rabbitmq');
const { logger } = require('../utils/logger');

const auditLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      const auditLogData = {
        service: process.env.SERVICE_NAME || 'default-service',
        userId: req.user ? req.user.id : null,
        action: `${req.method} ${req.originalUrl}`,
        endpoint: req.originalUrl,
        method: req.method,
        requestPayload: req.body,
        responseStatus: res.statusCode,
        ip: req.ip,
        timestamp: new Date(),
        metadata: { duration, userAgent: req.get('User-Agent') || '' },
      };

      await publishEvent('audit.log.created', auditLogData);
      logger.info('Audit event published', auditLogData);
    } catch (error) {
      logger.error('Error publishing audit event:', error);
    }
  });

  next();
};

module.exports = { auditLogger };
