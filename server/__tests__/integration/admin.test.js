jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  voteLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const PlaybackState = require('../../src/models/PlaybackState');

const JWT_SECRET = 'fallback_dev_secret';
const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// IT-17
test('IT-17: POST /api/admin/skip with valid JWT returns 200', async () => {
  const venue = await Venue.create({ name: 'AdminV', qrCodeSecret: `s-${Date.now()}` });
  await PlaybackState.create({ venueId: venue._id, isPlaying: false });

  const token = jwt.sign(
    { adminId: 'admin-1', venueId: venue._id.toString() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await request(app)
    .post('/api/admin/skip')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

// IT-18
test('IT-18: POST /api/admin/skip without JWT returns 401 No token provided', async () => {
  const res = await request(app).post('/api/admin/skip');
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('No token provided');
});
