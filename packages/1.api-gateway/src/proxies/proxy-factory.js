const proxy = require('express-http-proxy');
const { validateTokenFromCookie } = require('../middlewares/auth.middlewares');
const { logger } = require('@gaeservices/common');

function createProxy(service, options) {
  const middlewareStack = [];

  if (service.secure) middlewareStack.push(validateTokenFromCookie);

  const proxyHandler = proxy(service.target, {
    ...options,
    parseReqBody: service.isMultipart ? false : true,

    proxyReqPathResolver: (req) => {
      const isHealthCheck = /\/(health|status|ping|ready)/.test(req.path);

      // ✅ Only apply the rewrite to non-health routes
      const resolvedPath = isHealthCheck
        ? req.originalUrl.replace(/^\/v1\/[^/]+/, '') || '/' // strip "/v1/auth"
        : req.originalUrl.replace(/^\/v1/, '/api');

      logger.info(`Proxying request to ${service.name}: ${resolvedPath}`);
      return resolvedPath;
    },

    proxyReqOptDecorator: (proxyReqOpts, req) => {
      proxyReqOpts.headers['x-user-id'] = req.user?.authId || '';
      proxyReqOpts.headers['x-user-role'] = JSON.stringify(
        req.user?.role || ''
      );
      if (!service.isMultipart) {
        proxyReqOpts.headers['Content-Type'] = 'application/json';
      }
      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, _userReq, _userRes) => {
      logger?.info(
        `Response from ${service.name} service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  });

  middlewareStack.push((req, res, next) => {
    return proxyHandler(req, res, next);
  });

  return { paths: service.paths, handler: middlewareStack };
}

module.exports = { createProxy };
