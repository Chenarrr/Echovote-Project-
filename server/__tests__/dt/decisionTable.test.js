// Decision Table tests for POST /api/votes/:songId
// Inputs: Song Exists (Y/N) × FP New (Y/N) × Rate OK (Y/N)
//
// The rate limiter is mocked with a mutable flag so each DT row can
// independently flip it on/off without hitting the real express-rate-limit
// MemoryStore. Rate-limit middleware runs BEFORE the song-lookup handler,
// so whenever Rate OK = N the request short-circuits to 429 regardless of
// whether the song exists or the fingerprint is already voted.

jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => {
  const state = { rateOk: true };
  return {
    __state: state,
    voteLimiter: (req, res, next) => {
      if (state.rateOk) return next();
      return res.status(429).json({ error: 'Too many requests' });
    },
    authLimiter: (req, res, next) => next(),
    searchLimiter: (req, res, next) => next(),
  };
});

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');
const rateLimiterMock = require('../../src/middleware/rateLimiter');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());

let venueId, songIdExisting;

beforeEach(async () => {
  await clear();
  rateLimiterMock.__state.rateOk = true; // reset default
  const venue = await Venue.create({ name: 'DT Venue', qrCodeSecret: `s-${Date.now()}` });
  venueId = venue._id;
  const song = await Song.create({ youtubeId: 'yt-dt', title: 'DT Song', venueId });
  songIdExisting = song._id.toString();
  await ActiveQueue.create({ songId: song._id, venueId });
});

const bogusSongId = () => new mongoose.Types.ObjectId().toString();

// DT-01: Song=Y, FP=new, Rate=OK -> 200
test('DT-01: existing song + new fingerprint + rate OK -> 200', async () => {
  rateLimiterMock.__state.rateOk = true;
  const res = await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-01' });
  expect(res.status).toBe(200);
  expect(res.body.voteCount).toBe(1);
});

// DT-02: Song=Y, FP=new, Rate=BAD -> 429
test('DT-02: existing song + new fingerprint + rate limited -> 429', async () => {
  rateLimiterMock.__state.rateOk = false;
  const res = await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-02' });
  expect(res.status).toBe(429);
});

// DT-03: Song=Y, FP=already voted, Rate=OK -> 409
test('DT-03: existing song + already voted + rate OK -> 409', async () => {
  rateLimiterMock.__state.rateOk = true;
  // first vote
  await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-03' });
  // second vote from same fingerprint
  const res = await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-03' });
  expect(res.status).toBe(409);
  expect(res.body.error).toMatch(/already voted/i);
});

// DT-04: Song=Y, FP=already voted, Rate=BAD -> 429 (limiter wins)
test('DT-04: existing song + already voted + rate limited -> 429', async () => {
  // seed the prior vote with limiter ON
  rateLimiterMock.__state.rateOk = true;
  await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-04' });
  // now flip limiter and retry
  rateLimiterMock.__state.rateOk = false;
  const res = await request(app)
    .post(`/api/votes/${songIdExisting}`)
    .send({ visitorFingerprint: 'fp-dt-04' });
  expect(res.status).toBe(429);
});

// DT-05: Song=N, FP=new, Rate=OK -> 404
test('DT-05: non-existent song + new fingerprint + rate OK -> 404', async () => {
  rateLimiterMock.__state.rateOk = true;
  const res = await request(app)
    .post(`/api/votes/${bogusSongId()}`)
    .send({ visitorFingerprint: 'fp-dt-05' });
  expect(res.status).toBe(404);
});

// DT-06: Song=N, FP=new, Rate=BAD -> 429
test('DT-06: non-existent song + new fingerprint + rate limited -> 429', async () => {
  rateLimiterMock.__state.rateOk = false;
  const res = await request(app)
    .post(`/api/votes/${bogusSongId()}`)
    .send({ visitorFingerprint: 'fp-dt-06' });
  expect(res.status).toBe(429);
});

// DT-07: Song=N, FP=not new (vacuously), Rate=OK -> 404
test('DT-07: non-existent song + any fingerprint state + rate OK -> 404', async () => {
  rateLimiterMock.__state.rateOk = true;
  const res = await request(app)
    .post(`/api/votes/${bogusSongId()}`)
    .send({ visitorFingerprint: 'fp-dt-07' });
  expect(res.status).toBe(404);
});

// DT-08: Song=N, FP=not new, Rate=BAD -> 429
test('DT-08: non-existent song + any fingerprint state + rate limited -> 429', async () => {
  rateLimiterMock.__state.rateOk = false;
  const res = await request(app)
    .post(`/api/votes/${bogusSongId()}`)
    .send({ visitorFingerprint: 'fp-dt-08' });
  expect(res.status).toBe(429);
});
