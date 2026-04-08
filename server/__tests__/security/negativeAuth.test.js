// Negative / security-focused auth tests for admin endpoints + login endpoint.

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
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../../src/config/env');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// SEC-01
test('SEC-01: expired JWT -> 401', async () => {
  const expired = jwt.sign(
    { adminId: new mongoose.Types.ObjectId(), venueId: new mongoose.Types.ObjectId() },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  const res = await request(app)
    .get('/api/admin/venue')
    .set('Authorization', `Bearer ${expired}`);
  expect(res.status).toBe(401);
});

// SEC-02
test('SEC-02: tampered JWT (wrong signature) -> 401', async () => {
  const valid = jwt.sign(
    { adminId: 'x', venueId: 'y' },
    'a-totally-different-secret',
    { expiresIn: '1h' }
  );
  const res = await request(app)
    .get('/api/admin/venue')
    .set('Authorization', `Bearer ${valid}`);
  expect(res.status).toBe(401);
});

// SEC-03
test('SEC-03: missing "Bearer " prefix -> 401', async () => {
  const token = jwt.sign({ adminId: 'x', venueId: 'y' }, JWT_SECRET, { expiresIn: '1h' });
  const res = await request(app)
    .get('/api/admin/venue')
    .set('Authorization', token); // no "Bearer "
  expect(res.status).toBe(401);
});

// SEC-04
test('SEC-04: admin endpoint with another venue\'s token -> can only touch own venue', async () => {
  // Token for venueA, but admin.venue route reads req.admin.venueId,
  // so it returns 404 for venueA (since we never created one).
  // The real security property being tested: a token for venueA cannot
  // magically operate on venueB.
  const venueA = new mongoose.Types.ObjectId();
  const tokenA = jwt.sign({ adminId: 'a', venueId: venueA }, JWT_SECRET, { expiresIn: '1h' });

  const Venue = require('../../src/models/Venue');
  const venueB = await Venue.create({ name: 'B', qrCodeSecret: 's-b' });

  // Admin A tries to delete the queue of a song that belongs to venue B.
  const Song = require('../../src/models/Song');
  const ActiveQueue = require('../../src/models/ActiveQueue');
  const songB = await Song.create({ youtubeId: 'yb', title: 'B', venueId: venueB._id });
  await ActiveQueue.create({ songId: songB._id, venueId: venueB._id });

  const res = await request(app)
    .delete(`/api/admin/queue/${songB._id}`)
    .set('Authorization', `Bearer ${tokenA}`);
  // Request "succeeds" structurally but deletes nothing (the route filters
  // by venueId from the JWT). The song for venue B must still exist.
  expect(res.status).toBe(200);
  const stillThere = await ActiveQueue.findOne({ songId: songB._id });
  expect(stillThere).not.toBeNull();
});

// SEC-05
test('SEC-05: login returns identical error for unknown email vs wrong password (no user-enumeration)', async () => {
  // Register one real admin
  const Admin = require('../../src/models/Admin');
  const Venue = require('../../src/models/Venue');
  const bcrypt = require('bcryptjs');
  const venue = await Venue.create({ name: 'Enum', qrCodeSecret: 's-enum' });
  await Admin.create({
    email: 'real@ev.com',
    passwordHash: await bcrypt.hash('rightpw', 12),
    venueId: venue._id,
  });

  const unknown = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ghost@ev.com', password: 'anything' });
  const wrongPw = await request(app)
    .post('/api/auth/login')
    .send({ email: 'real@ev.com', password: 'wrong' });

  expect(unknown.status).toBe(401);
  expect(wrongPw.status).toBe(401);
  expect(unknown.body.error).toBe(wrongPw.body.error); // identical message
});

// SEC-06
test('SEC-06: malformed Authorization header (garbage token) -> 401', async () => {
  const res = await request(app)
    .get('/api/admin/venue')
    .set('Authorization', 'Bearer not.a.real.jwt');
  expect(res.status).toBe(401);
});
