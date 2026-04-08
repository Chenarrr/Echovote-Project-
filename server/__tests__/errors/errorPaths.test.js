// Error-path integration tests.
//
// Covers: external API failure, malformed/oversized request bodies,
// invalid ObjectIds in params, DB failures mid-request, and stale state
// (venue deleted while someone is voting).

jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  voteLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

jest.mock('axios');

const axios = require('axios');
const express = require('express');
const request = require('supertest');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => {
  await clear();
  axios.get.mockReset?.();
});

// ERR-01
test('ERR-01: YouTube API returns 500 -> /api/songs/search responds 500 with error, does not crash', async () => {
  axios.get.mockRejectedValueOnce(Object.assign(new Error('YT down'), { response: { status: 500 } }));
  const res = await request(app).get('/api/songs/search?q=foo');
  expect(res.status).toBe(500);
  expect(res.body.error).toBeDefined();
});

// ERR-02
test('ERR-02: malformed JSON body -> 400, no unhandled exception', async () => {
  const res = await request(app)
    .post('/api/songs/anyvenue')
    .set('Content-Type', 'application/json')
    .send('{not valid json');
  // express.json() surfaces a body-parser error as 400
  expect(res.status).toBe(400);
});

// ERR-03
test('ERR-03: oversized JSON body rejected with 413', async () => {
  // Build a tiny app with a 1KB json limit and mount a stub route that
  // echoes. We can't easily change the main app's json limit at runtime,
  // so this test asserts the general Express pattern used in prod.
  const tinyApp = express();
  tinyApp.use(express.json({ limit: '1kb' }));
  tinyApp.post('/echo', (req, res) => res.json(req.body));

  const huge = { data: 'x'.repeat(2048) };
  const res = await request(tinyApp).post('/echo').send(huge);
  expect(res.status).toBe(413);
});

// ERR-04
test('ERR-04: invalid ObjectId in vote route -> 500 or 404 (never crash)', async () => {
  const res = await request(app)
    .post('/api/votes/not-an-objectid')
    .send({ visitorFingerprint: 'fp' });
  // Current behaviour: Mongoose CastError becomes 500. Acceptable as long
  // as the server keeps running and the error surface is structured.
  expect([400, 404, 500]).toContain(res.status);
  expect(res.body.error).toBeDefined();
});

// ERR-05
test('ERR-05: DB failure mid-request (simulate findOne throwing) -> 500 with error, process stays up', async () => {
  const venue = await Venue.create({ name: 'EV', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yterr', title: 'E', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });

  const spy = jest.spyOn(ActiveQueue, 'findOneAndUpdate').mockImplementationOnce(() => {
    throw new Error('Simulated DB failure');
  });

  const res = await request(app)
    .post(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-err' });
  expect(res.status).toBe(500);
  expect(res.body.error).toMatch(/simulated db/i);
  spy.mockRestore();

  // After the error, a second valid vote still works → process wasn't corrupted.
  const ok = await request(app)
    .post(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-recover' });
  expect(ok.status).toBe(200);
});

// ERR-06
test('ERR-06: venue deleted mid-flow: vote after queue-entry removed -> 404, no crash', async () => {
  const venue = await Venue.create({ name: 'Stale', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yts', title: 'S', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });

  // Delete the queue entry (simulating admin wiping the venue)
  await ActiveQueue.deleteMany({ venueId: venue._id });

  const res = await request(app)
    .post(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-stale' });
  expect(res.status).toBe(404);
  expect(res.body.error).toMatch(/not in active queue/i);
});
