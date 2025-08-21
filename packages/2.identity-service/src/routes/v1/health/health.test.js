jest.mock('@gaeservices/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  errorHandler: (err, _req, res, _next) =>
    res.status(500).json({ error: err.message }),
  corsOptions: { origin: (_origin, cb) => cb(null, true) },
  credentials: (_req, _res, next) => next(),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    quit: jest.fn(),
  }));
});

jest.mock(
  'rate-limiter-flexible',
  () => ({
    RateLimiterRedis: jest.fn().mockImplementation(() => ({
      consume: jest.fn().mockResolvedValue(true),
    })),
  }),
  { virtual: true }
);

const request = require('supertest');
const express = require('express');
const app = require('../../../app');

describe('Indentity Services', () => {
  it('should respond with 200 and health JSON at GET /health', async () => {
    const res = await request(app)
      .get('/health')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('memoryUsage');
    expect(res.body).toHaveProperty('pid');
    expect(res.body).toHaveProperty('service');
  });

  it('should apply CORS headers', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:8001');

    expect(res.headers).toHaveProperty('access-control-allow-origin');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:8001'
    );
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/nonexistent')
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should handle errors via errorHandler middleware', async () => {
    // create a standalone app to test only errorhandler
    const localApp = express();
    // route that always throws
    localApp.get('/fail', () => {
      throw new Error('Test failure');
    });
    // mount the (mocked) errorHandler from @gaeservices/common
    const { errorHandler } = require('@gaeservices/common');
    localApp.use(errorHandler);

    const res = await request(localApp).get('/fail');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Test failure');
  });
});
