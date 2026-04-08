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
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());

let venueId, songId;

beforeEach(async () => {
  await clear();
  const venue = await Venue.create({ name: 'VotesVenue', qrCodeSecret: `s-${Date.now()}` });
  venueId = venue._id;
  const song = await Song.create({ youtubeId: 'yt-v1', title: 'Vote Song', venueId });
  songId = song._id.toString();
  await ActiveQueue.create({ songId: song._id, venueId });
});

// IT-13
test('IT-13: POST /api/votes/:songId with valid fingerprint returns 200 with voteCount=1', async () => {
  const res = await request(app)
    .post(`/api/votes/${songId}`)
    .send({ visitorFingerprint: 'fp-13' });

  expect(res.status).toBe(200);
  expect(res.body.voteCount).toBe(1);
});

// IT-14
test('IT-14: POST /api/votes/:songId with duplicate fingerprint returns 409', async () => {
  await request(app).post(`/api/votes/${songId}`).send({ visitorFingerprint: 'fp-14' });

  const res = await request(app).post(`/api/votes/${songId}`).send({ visitorFingerprint: 'fp-14' });

  expect(res.status).toBe(409);
  expect(res.body.error).toMatch(/Already voted/);
});

// IT-15
test('IT-15: DELETE /api/votes/:songId after a vote decrements voteCount to 0', async () => {
  await request(app).post(`/api/votes/${songId}`).send({ visitorFingerprint: 'fp-15' });

  const res = await request(app)
    .delete(`/api/votes/${songId}`)
    .send({ visitorFingerprint: 'fp-15' });

  expect(res.status).toBe(200);
  expect(res.body.voteCount).toBe(0);
});

// IT-16
test('IT-16: DELETE /api/votes/:songId without prior vote returns 400', async () => {
  const res = await request(app)
    .delete(`/api/votes/${songId}`)
    .send({ visitorFingerprint: 'never-voted' });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/have not voted/);
});
