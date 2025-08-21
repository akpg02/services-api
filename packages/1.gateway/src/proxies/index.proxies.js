const services = require('./service-config');
const { createProxy } = require('./proxy-factory');
const { logger } = require('@gaeservices/common');

const proxyOptions = {
  proxyErrorHandler: (err, res, _next) => {
    logger.error(`Proxy error: ${err.message}`);
    res
      .status(500)
      .json({ message: `Internal server error`, error: err.message });
  },
};

module.exports = (app) => {
  for (const service of services) {
    const { paths, handler } = createProxy(service, proxyOptions);
    paths.forEach((path) => app.use(path, ...handler));
  }
};
