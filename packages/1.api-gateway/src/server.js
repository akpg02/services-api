require('dotenv').config();

const http = require('http');
const app = require('./app');
const { logger } = require('@gaeservices/common');
const { services } = require('./services');
const { checkServiceHealth } = require('./utils/health.check');

const PORT = process.env.PORT || 8000;
const HEALTH_INTERVAL_MS = 20 * 1000;

async function startServer() {
  // Start HTTP server
  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info(`🚀 API Gateway is running on port ${PORT}`);
  });

  // Schedule recurring health checks
  setInterval(async () => {
    logger.info('⏱️ Running scheduled health check…');
    try {
      await checkServiceHealth(services);
      logger.info('✅ Scheduled health check passed.');
    } catch (err) {
      logger.error('❌ Scheduled health check failed', err);
    }
  }, HEALTH_INTERVAL_MS);
}

startServer();
