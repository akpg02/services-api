const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { logger } = require('@gaeservices/common');
const { ping } = require('./ping.service'); // <-- use the shared pinger

const LOG_DIR = path.join(__dirname, '..', 'logs');
const REPORT_PATH = path.join(__dirname, '..', 'startup-health-report.json');
const PROMETHEUS_EXPORT = path.join(__dirname, '..', 'startup-health.prom');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}
const getDateString = () => new Date().toISOString().split('T')[0];

/**
 * services can be a map of:
 *   { serviceName: "http://host:port" }
 * or (optionally) objects:
 *   { serviceName: { baseUrl: "http://host:port", path: "/custom-health" } }
 */
async function checkServiceHealth(services) {
  if (process.env.NODE_ENV === 'production') {
    console.log(
      chalk.yellow('🔒 Skipping service health checks in production.')
    );
    return;
  }
  if (!services || typeof services !== 'object') {
    const msg = `checkServiceHealth: expected an object of services, got ${services}`;
    logger.error(msg);
    throw new Error(msg);
  }

  console.log(chalk.blue.bold('\n🔍 Checking microservice health...\n'));
  ensureLogDir();

  const results = [];
  const metrics = [];

  for (const [name, svc] of Object.entries(services)) {
    let baseUrl,
      pathSuffix = '/health';
    if (typeof svc === 'string') {
      baseUrl = svc;
    } else if (
      svc &&
      typeof svc === 'object' &&
      typeof svc.baseUrl === 'string'
    ) {
      baseUrl = svc.baseUrl;
      if (typeof svc.path === 'string' && svc.path.trim())
        pathSuffix = svc.path;
    } else {
      logger.warn(`Skipping "${name}" – invalid service config:`, svc);
      continue;
    }

    const r = await ping(baseUrl, { path: pathSuffix });

    const resEntry = {
      name,
      baseUrl,
      url: r.url,
      status: r.statusText,
      httpStatus: r.httpStatus,
      durationMs: r.durationMs,
    };
    if (r.error) resEntry.error = r.error;

    if (r.statusText === 'UP') {
      console.log(
        chalk.green(
          `✅ ${name} is UP → ${baseUrl} (${r.httpStatus}, ${r.durationMs}ms)`
        )
      );
      metrics.push(`service_health{service="${name}"} 1`);
    } else if (r.statusText === 'DEGRADED') {
      console.log(
        chalk.keyword('orange')(
          `⚠️  ${name} degraded → ${baseUrl} (${r.httpStatus}, ${r.durationMs}ms)`
        )
      );
      metrics.push(`service_health{service="${name}"} 0`);
    } else {
      console.log(
        chalk.red(`❌ ${name} is DOWN → ${baseUrl} | Error: ${r.error}`)
      );
      metrics.push(`service_health{service="${name}"} 0`);
    }

    results.push(resEntry);
  }

  // JSON report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(chalk.cyan(`\n📊 JSON report saved to: ${REPORT_PATH}`));

  // Daily text log
  const dailyLogPath = path.join(LOG_DIR, `${getDateString()}-health.log`);
  const textLog = results
    .map(
      (r) =>
        `${r.name}: ${r.status} ${r.httpStatus || ''} ${
          r.durationMs ? r.durationMs + 'ms' : ''
        } → ${r.baseUrl}` + (r.error ? ` | Error: ${r.error}` : '')
    )
    .join('\n');
  fs.writeFileSync(dailyLogPath, textLog);
  console.log(chalk.gray(`📁 Log written to: ${dailyLogPath}`));

  // Prometheus export
  fs.writeFileSync(PROMETHEUS_EXPORT, metrics.join('\n'));
  console.log(chalk.magenta(`📤 Prometheus export: ${PROMETHEUS_EXPORT}\n`));
}

module.exports = { checkServiceHealth };
