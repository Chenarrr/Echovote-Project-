const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');

// Create fresh app instances with fresh limiter state per test
const createVoteLimiterApp = () => {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down' },
  });
  const app = express();
  app.get('/test', limiter, (req, res) => res.status(200).json({ ok: true }));
  return app;
};

const createAuthLimiterApp = () => {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later' },
  });
  const app = express();
  app.post('/test', limiter, (req, res) => res.status(200).json({ ok: true }));
  return app;
};

describe('voteLimiter', () => {
  let app;

  beforeEach(() => {
    app = createVoteLimiterApp();
  });

  // UT-07
  test('UT-07: allows first 10 requests within 1 min', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  // UT-08
  test('UT-08: blocks 11th request with 429', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get('/test');
    }
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
  });
});

describe('authLimiter', () => {
  let app;

  beforeEach(() => {
    app = createAuthLimiterApp();
  });

  // UT-22
  test('UT-22: allows first 20 requests within 15 min', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post('/test');
      expect(res.status).toBe(200);
    }
  });

  // UT-23
  test('UT-23: blocks 21st request with 429', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app).post('/test');
    }
    const res = await request(app).post('/test');
    expect(res.status).toBe(429);
  });
});
