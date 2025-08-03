const express = require('express');
const request = require('supertest');

// Stub swagger-ui-express so it doesn't attempt reall serving
jest.mock('swagger-ui-express', () => ({
  serve: (_req, _res, next) => next(),
  setup: jest.fn(),
}));

// Mock docsController with inline factory
jest.mock('./docs.controller.js', () => ({
  swaggerDoc: (_req, res) => res.send('<html>Swagger UI</html>'),
  redoc: (_req, res) => res.send('<html>ReDoc</html>'),
}));

// import the router under test
const docsRouter = require('./docs.router');

// Mount it on a fresh app instance
const app = express();
app.use('/docs', docsRouter);

describe('Docs Routes', () => {
  it('GET /docs/swagger should return Swagger UI HTML', async () => {
    const res = await request(app)
      .get('/docs/swagger')
      .set('Accept', 'text/html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });

  it('GET /docs/redoc should return ReDoc HTML', async () => {
    const res = await request(app)
      .get('/docs/redoc')
      .set('Accept', 'text/html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('ReDoc');
  });

  it('GET /docs/unknown return 404', async () => {
    const res = await request(app).get('/docs/unknown');
    expect(res.status).toBe(404);
  });
});
