const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../../src/middleware/auth');

// Matches the default in src/config/env.js
const JWT_SECRET = 'fallback_dev_secret';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.get('/protected', authMiddleware, (req, res) => {
    res.json({ admin: req.admin });
  });
  return app;
};

let app;

beforeEach(() => {
  app = createApp();
});

// UT-04
test('UT-04: valid JWT passes middleware and sets req.admin', async () => {
  const token = jwt.sign({ adminId: 'admin-id-1', venueId: 'venue-id-1' }, JWT_SECRET, { expiresIn: '1h' });
  const res = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.admin).toMatchObject({ adminId: 'admin-id-1', venueId: 'venue-id-1' });
});

// UT-05
test('UT-05: missing Bearer token returns 401', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('No token provided');
});

// UT-06
test('UT-06: expired JWT returns 401', async () => {
  const expiredToken = jwt.sign(
    { adminId: 'admin-id-1', venueId: 'venue-id-1', exp: Math.floor(Date.now() / 1000) - 3600 },
    JWT_SECRET
  );
  const res = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${expiredToken}`);

  expect(res.status).toBe(401);
  expect(res.body.error).toBe('Invalid or expired token');
});
