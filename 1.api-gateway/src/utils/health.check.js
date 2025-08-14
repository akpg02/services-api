// utils/health.check.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { logger } = require('@gaeservices/common');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const REPORT_PATH = path.join(__dirname, '..', 'startup-health-report.json');
const PROMETHEUS_EXPORT = path.join(__dirname, '..', 'startup-health.prom');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

const getDateString = () => new Date().toISOString().split('T')[0];

async function checkServiceHealth(services) {
  // 1) Skip in production
  if (process.env.NODE_ENV === 'production') {
    console.log(
      chalk.yellow('🔒 Skipping service health checks in production.')
    );
    return;
  }

  // 2) Validate argument
  if (!services || typeof services !== 'object') {
    const msg = `checkServiceHealth: expected an object of services, got ${services}`;
    logger.error(msg);
    throw new Error(msg);
  }

  console.log(chalk.blue.bold('\n🔍 Checking microservice health...\n'));
  ensureLogDir();

  const results = [];
  const prometheusMetrics = [];

  for (const [name, rawBaseUrl] of Object.entries(services)) {
    // 3) Guard non-string URLs
    if (typeof rawBaseUrl !== 'string') {
      logger.warn(`Skipping "${name}" – invalid baseUrl:`, rawBaseUrl);
      continue;
    }

    const cleanBase = rawBaseUrl.replace(/\/+$/, '');
    const url = `${cleanBase}/health`;
    const result = { name, baseUrl: rawBaseUrl, url };

    try {
      const res = await axios.get(url, { timeout: 1000 });
      result.status = 'UP';
      result.httpStatus = res.status;
      prometheusMetrics.push(`service_health{service="${name}"} 1`);
      console.log(
        chalk.green(`✅ ${name} is UP → ${rawBaseUrl} (HTTP ${res.status})`)
      );
    } catch (err) {
      result.status = 'DOWN';
      result.error = err.message;
      prometheusMetrics.push(`service_health{service="${name}"} 0`);
      console.log(
        chalk.red(`❌ ${name} is DOWN → ${rawBaseUrl} | Error: ${err.message}`)
      );
    }

    results.push(result);
  }

  // 4) Write JSON report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(chalk.cyan(`\n📊 JSON report saved to: ${REPORT_PATH}`));

  // 5) Write daily text log
  const dailyLogPath = path.join(LOG_DIR, `${getDateString()}-health.log`);
  const textLog = results
    .map(
      (r) =>
        `${r.name}: ${r.status} ${r.httpStatus || ''} → ${r.baseUrl}` +
        (r.error ? ` | Error: ${r.error}` : '')
    )
    .join('\n');
  fs.writeFileSync(dailyLogPath, textLog);
  console.log(chalk.gray(`📁 Log written to: ${dailyLogPath}`));

  // 6) Write Prometheus export
  fs.writeFileSync(PROMETHEUS_EXPORT, prometheusMetrics.join('\n'));
  console.log(chalk.magenta(`📤 Prometheus export: ${PROMETHEUS_EXPORT}\n`));
}

module.exports = { checkServiceHealth };
