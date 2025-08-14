const { createAuditLog } = require('../services/audit.service');

function auditHttp(action = 'api.request') {
  return function auditMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    req._startTs = Date.now();

    res.on('finish', async () => {
      try {
        const ns = Number(process.hrtime.bigint() - start);
        const latencyMs = Math.max(0, Math.round(ns / 1e6));

        await createAuditLog({
          service: process.env.SERVICE_NAME || 'api-gateway',
          action: `${action}.${res.statusCode >= 400 ? 'failure' : 'success'}`,
          actor: { type: req.user ? 'user' : 'service', id: req.user?.authId },
          resource: { type: 'route', id: req.originalUrl },
          channel: 'http',
          direction: 'inbound',
          status: res.statusCode >= 400 ? 'failure' : 'success',
          statusCode: res.statusCode,
          requestId: req._logCtx?.requestId,
          correlationId: req.headers['x-correlation-id'],
          latencyMs,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          http: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          request: {
            body: req.body,
            headers: { authorization: req.headers.authorization },
          },
          response: {
            headers: { 'content-length': res.get('content-length') },
          },
        });
      } catch (_) {
        // swallow audit failures; don't break the request path
      }
    });

    next();
  };
}

module.exports = { auditHttp };
