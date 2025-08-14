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
      const isHealth = /\/(health|status|ping|ready)/.test(req.path);

      if (isHealth) {
        const stripped = req.originalUrl.replace(/^\/v\d+\/[^/]+/, '');
        logger.info(`Proxy [health] ${service.name} -> ${stripped || '/'}`);
        return stripped || '/';
      }

      // Pass through unchanged for normal routes:
      logger.info(`Proxy ${service.name} -> ${req.originalUrl}`);
      return req.originalUrl;
    },

    proxyReqOptDecorator: (proxyReqOpts, req) => {
      proxyReqOpts.headers['x-user-id'] = req.user?.authId || '';
      proxyReqOpts.headers['x-user-role'] = JSON.stringify(
        req.user?.role || ''
      );
      if (!service.isMultipart)
        proxyReqOpts.headers['Content-Type'] = 'application/json';

      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData) => {
      logger?.info(
        `Response from ${service.name} service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  });

  middlewareStack.push((req, res, next) => proxyHandler(req, res, next));
  return { paths: service.paths, handler: middlewareStack };
}

module.exports = { createProxy };
