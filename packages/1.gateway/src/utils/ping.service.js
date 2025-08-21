const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');

const TIMEOUT_MS = Number(process.env.HC_TIMEOUT_MS || 2000);
const ALLOW_INSECURE =
  String(process.env.HC_ALLOW_INSECURE || 'false').toLowerCase() === 'true';

// Optional: path to the CA that signed your gateway cert
const CA_PATH = process.env.HC_CA_FILE; // e.g. ./certs/gateway-rootCA.pem
const CA =
  CA_PATH && fs.existsSync(CA_PATH) ? fs.readFileSync(CA_PATH) : undefined;

// Optional: force SNI servername if you connect via IP but the cert is for "localhost"
const FORCED_SERVERNAME = process.env.HC_SERVERNAME || undefined;

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized:
    process.env.NODE_ENV === 'production' ? true : !ALLOW_INSECURE,
  ca: CA, // <- trust your self-signed CA
  servername: FORCED_SERVERNAME, // <- only if needed (e.g., 'localhost')
});

/**
 * @param {string} baseUrl e.g. "https://localhost:8000"
 * @param {{ path?: string, timeout?: number }} [opts]
 */
async function ping(baseUrl, { path = '/health', timeout = TIMEOUT_MS } = {}) {
  if (typeof baseUrl !== 'string' || !baseUrl) {
    throw new Error('ping: baseUrl must be a non-empty string');
  }
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const url = `${cleanBase}${path.startsWith('/') ? path : `/${path}`}`;
  const isHttps = cleanBase.toLowerCase().startsWith('https://');

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      timeout,
      ...(isHttps ? { httpsAgent } : { httpAgent }),
      validateStatus: (s) => s >= 200 && s < 500,
      headers: { 'User-Agent': 'startup-health-check/1.0' },
    });
    const durationMs = Date.now() - t0;
    const ok = res.status >= 200 && res.status < 300;
    return {
      ok,
      statusText: ok ? 'UP' : 'DEGRADED',
      httpStatus: res.status,
      durationMs,
      url,
    };
  } catch (err) {
    const durationMs = Date.now() - t0;
    return {
      ok: false,
      statusText: 'DOWN',
      durationMs,
      url,
      error: err.code || err.message,
    };
  }
}

module.exports = { ping };
