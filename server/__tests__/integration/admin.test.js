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
const fs = require('fs/promises');
const path = require('path');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const PlaybackState = require('../../src/models/PlaybackState');

const JWT_SECRET = 'fallback_dev_secret';
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const app = createApp();
const createdUploadPaths = [];

const createAdminToken = (venueId) =>
  jwt.sign({ adminId: 'admin-1', venueId: venueId.toString() }, JWT_SECRET, { expiresIn: '1h' });

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAE/wH+Mc1ZJwAAAABJRU5ErkJggg==',
  'base64'
);

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());
afterEach(async () => {
  await Promise.all(
    createdUploadPaths.splice(0).map(async (relativePath) => {
      const absolutePath = path.join(UPLOADS_DIR, path.basename(relativePath));
      await fs.rm(absolutePath, { force: true });
    })
  );
});

// IT-17
test('IT-17: POST /api/admin/skip with valid JWT returns 200', async () => {
  const venue = await Venue.create({ name: 'AdminV', qrCodeSecret: `s-${Date.now()}` });
  await PlaybackState.create({ venueId: venue._id, isPlaying: false });

  const token = createAdminToken(venue._id);

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

// IT-19
test('IT-19: POST /api/admin/venue-image with a real PNG stores a server-generated image path', async () => {
  const venue = await Venue.create({ name: 'AdminImageV', qrCodeSecret: `s-${Date.now()}` });
  const token = createAdminToken(venue._id);

  const res = await request(app)
    .post('/api/admin/venue-image')
    .set('Authorization', `Bearer ${token}`)
    .attach('image', PNG_1X1, { filename: 'avatar.png', contentType: 'image/png' });

  expect(res.status).toBe(200);
  expect(res.body.image).toMatch(/^\/uploads\/venue-\d+-.*\.png$/);
  createdUploadPaths.push(res.body.image);

  const updatedVenue = await Venue.findById(venue._id);
  expect(updatedVenue.image).toBe(res.body.image);
});

// IT-20
test('IT-20: POST /api/admin/venue-image rejects fake image content even with image mime type', async () => {
  const venue = await Venue.create({ name: 'AdminImageRejectV', qrCodeSecret: `s-${Date.now()}` });
  const token = createAdminToken(venue._id);

  const res = await request(app)
    .post('/api/admin/venue-image')
    .set('Authorization', `Bearer ${token}`)
    .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'avatar.png', contentType: 'image/png' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Uploaded file content is not a supported image');

  const updatedVenue = await Venue.findById(venue._id);
  expect(updatedVenue.image).toBeNull();
});
