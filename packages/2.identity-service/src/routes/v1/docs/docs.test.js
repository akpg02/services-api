// src/routes/docs/v1/docs.router.test.js
const express = require('express');
const request = require('supertest');

// Mock swagger-ui-express so it doesn't try to serve assets
jest.mock('swagger-ui-express', () => ({
  serve: (_req, _res, next) => next(),
  setup: jest.fn(
    () => (_req, res) => res.send('<html>Swagger UI (setup mocked)</html>')
  ),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolovedValue('OK'),
    on: jest.fn(),
    quit: jest.fn(),
  }));
});

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue(true),
  })),
}));

// IMPORTANT: mock the EXACT path your router requires:
//   router file:  src/routes/docs/v1/docs.router.js
//   controller:   src/routes/docs/docs.controller.js
//   require str:  '../docs.controller'
jest.mock('../docs/docs.controller', () => ({
  swaggerDocVersioned: (_req, res) => res.send('<html>Swagger UI</html>'),
  redocVersioned: (_req, res) => res.send('<html>ReDoc</html>'),
  redirectSwaggerLatest: (_req, res) => res.redirect(302, '/docs/swagger/v1'),
  redirectRedocLatest: (_req, res) => res.redirect(302, '/docs/redoc/v1'),
}));

// Now require the router under test (AFTER mocks)
const docsRouter = require('./docs.router');

const app = express();
app.use('/docs', docsRouter);

describe('Docs Routes', () => {
  it('GET /docs/swagger redirects to latest', async () => {
    const res = await request(app).get('/docs/swagger');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/docs/swagger/v1');
  });

  it('GET /docs/swagger/v1 returns Swagger HTML', async () => {
    const res = await request(app).get('/docs/swagger/v1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });

  it('GET /docs/redoc redirects to latest', async () => {
    const res = await request(app).get('/docs/redoc');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/docs/redoc/v1');
  });

  it('GET /docs/redoc/v1 returns ReDoc HTML', async () => {
    const res = await request(app).get('/docs/redoc/v1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ReDoc');
  });

  it('GET /docs/unknown returns 404', async () => {
    const res = await request(app).get('/docs/unknown');
    expect(res.status).toBe(404);
  });
});
