const {
  fetchAuditLogById,
  fetchAuditLogs,
} = require('../../../models/audit.model');
const { logger } = require('@gaeservices/common');

exports.getLogs = async (req, res, next) => {
  logger.info('GET /v1/audit-logs');
  try {
    const result = await fetchAuditLogs(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('Error fetching audit logs', err);
    next(err);
  }
};

exports.getLog = async (req, res, next) => {
  const { id } = req.params;
  logger.info(`GET /v1/audit-logs/${id}`);
  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'id param is required' });
    }

    const { isValidObjectId } = require('mongoose');
    if (typeof isValidObjectId === 'function' && !isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid id format' });
    }
    const log = await fetchAuditLogById(id);
    if (!log) {
      return res
        .status(400)
        .json({ success: false, message: 'Audit log not found' });
    }
    return res.status(200).json({ success: true, data: log });
  } catch (err) {
    logger.error('Error fetching audit log', err);
    return next(err);
  }
};
