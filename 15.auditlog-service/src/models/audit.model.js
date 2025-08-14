const auditDB = require('./audit.mongo');
const { ApiFeatures } = require('@gaeservices/common');

async function fetchAuditLogs(queryString) {
  const features = new ApiFeatures(auditDB.find(), queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [data, total] = await Promise.all([
    features.query.lean(),
    auditDB.countDocuments(features._filter),
  ]);

  const { page, limit } = features.paginate;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return { data, meta: { page, limit, total, totalPages } };
}

async function fetchAuditLogById(id) {
  return await auditDB.findById(id).lean();
}

async function createAuditLog(doc) {
  const created = await auditDB.create(doc);
  return created.toObject();
}

module.exports = {
  fetchAuditLogs,
  fetchAuditLogById,
  createAuditLog,
};
