const { logger } = require('@gaeservices/common');
const { createAuditLog } = require('../../../models/audit.model');

exports.createLog = async (req, res, next) => {
  logger.info('POST /audit-log');
  try {
    const created = await createAuditLog({
      ...req.body,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.authId,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error('Error creating audit log', err);
    next(err);
  }
};
