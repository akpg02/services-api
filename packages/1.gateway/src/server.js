require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const app = require('./app');
const { logger } = require('@gaeservices/common');
const { services } = require('./services');
const { checkServiceHealth } = require('./utils/health.check');

const PORT = process.env.PORT || 8000;
const HEALTH_INTERVAL_MS = 20 * 1000;
const HTTPS_ENABLE = String(process.env.HTTPS_ENABLE).toLowerCase() === 'true';

async function startServer() {
  // Start HTTP server
  if (HTTPS_ENABLE) {
    const key = fs.readFileSync(process.env.MTLS_KEY_PATH);
    const cert = fs.readFileSync(process.env.MTLS_CERT_PATH);
    const opts = { key, cert };

    https.createServer(opts, app).listen(PORT, () => {
      logger.info(`🔐 HTTPS gateway listening on :${PORT}`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      logger.info(`🌐 HTTP gateway listening on :${PORT}`);
    });
  }

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
