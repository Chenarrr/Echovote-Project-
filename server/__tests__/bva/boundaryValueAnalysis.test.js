// Boundary Value Analysis tests — exercise values at and around limits.

jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

// rateLimiter middleware is globally mocked as no-op. BVA-RL tests below
// use their own fresh express-rate-limit instances directly, so they
// do NOT rely on the mocked middleware.
jest.mock('../../src/middleware/rateLimiter', () => ({
  voteLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');

const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// ─── BVA-RL: voteLimiter boundary (max = 10 requests / 60s) ───────────
describe('BVA-RL: voteLimiter boundaries (max=10)', () => {
  let limitedApp;

  beforeEach(() => {
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please slow down' },
    });
    limitedApp = express();
    limitedApp.get('/test', limiter, (req, res) => res.status(200).json({ ok: true }));
  });

  const hitN = async (n) => {
    let last;
    for (let i = 0; i < n; i++) last = await request(limitedApp).get('/test');
    return last;
  };

  test('BVA-RL-01: 1st request (min) → 200', async () => {
    const res = await hitN(1);
    expect(res.status).toBe(200);
  });

  test('BVA-RL-02: 5th request (nominal) → 200', async () => {
    const res = await hitN(5);
    expect(res.status).toBe(200);
  });

  test('BVA-RL-03: 10th request (at max) → 200', async () => {
    const res = await hitN(10);
    expect(res.status).toBe(200);
  });

  test('BVA-RL-04: 11th request (max+1) → 429', async () => {
    const res = await hitN(11);
    expect(res.status).toBe(429);
  });

  test('BVA-RL-05: 15th request (well above max) → 429', async () => {
    const res = await hitN(15);
    expect(res.status).toBe(429);
  });
});

// ─── BVA-SL: Song-per-fingerprint limit (max = 2) ──────────────────────
describe('BVA-SL: songs-per-fingerprint boundary (max=2)', () => {
  let venueId;

  beforeEach(async () => {
    const venue = await Venue.create({ name: 'SLV', qrCodeSecret: `s-${Date.now()}` });
    venueId = venue._id.toString();
  });

  test('BVA-SL-01: 1st song (min) → 201', async () => {
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-1', title: '1', addedBy: 'fp-sl' });
    expect(res.status).toBe(201);
  });

  test('BVA-SL-02: 2nd song (at max) → 201', async () => {
    await request(app).post(`/api/songs/${venueId}`).send({ youtubeId: 'sl-1', title: '1', addedBy: 'fp-sl' });
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-2', title: '2', addedBy: 'fp-sl' });
    expect(res.status).toBe(201);
  });

  test('BVA-SL-03: 3rd song (max+1) → 403', async () => {
    await request(app).post(`/api/songs/${venueId}`).send({ youtubeId: 'sl-1', title: '1', addedBy: 'fp-sl' });
    await request(app).post(`/api/songs/${venueId}`).send({ youtubeId: 'sl-2', title: '2', addedBy: 'fp-sl' });
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-3', title: '3', addedBy: 'fp-sl' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only add up to 2 songs/);
  });

  test('BVA-SL-04: delete 1 then add → back to max → 201', async () => {
    const first = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-1', title: '1', addedBy: 'fp-sl' });
    await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-2', title: '2', addedBy: 'fp-sl' });

    await request(app)
      .delete(`/api/songs/${venueId}/${first.body.song._id}`)
      .send({ fingerprint: 'fp-sl' });

    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'sl-3', title: '3', addedBy: 'fp-sl' });
    expect(res.status).toBe(201);
  });
});

// ─── BVA-VC: Vote count boundaries ─────────────────────────────────────
describe('BVA-VC: vote count boundaries', () => {
  let venueId, songA_id, songB_id;

  beforeEach(async () => {
    const venue = await Venue.create({ name: 'VCV', qrCodeSecret: `s-${Date.now()}` });
    venueId = venue._id;
    const songA = await Song.create({ youtubeId: 'vc-a', title: 'A', venueId });
    const songB = await Song.create({ youtubeId: 'vc-b', title: 'B', venueId });
    songA_id = songA._id.toString();
    songB_id = songB._id.toString();
    await ActiveQueue.create({ songId: songA._id, venueId });
    await ActiveQueue.create({ songId: songB._id, venueId });
  });

  test('BVA-VC-01: first vote 0→1', async () => {
    const res = await request(app)
      .post(`/api/votes/${songA_id}`)
      .send({ visitorFingerprint: 'fp-1' });
    expect(res.status).toBe(200);
    expect(res.body.voteCount).toBe(1);
  });

  test('BVA-VC-02: vote then undo → 1→0, never negative', async () => {
    await request(app).post(`/api/votes/${songA_id}`).send({ visitorFingerprint: 'fp-1' });
    const res = await request(app)
      .delete(`/api/votes/${songA_id}`)
      .send({ visitorFingerprint: 'fp-1' });
    expect(res.status).toBe(200);
    expect(res.body.voteCount).toBe(0);
    expect(res.body.voteCount).not.toBeLessThan(0);
  });

  test('BVA-VC-03: song with 0 votes sorts last in queue', async () => {
    // Give songB a vote. songA stays at 0. Queue sorted by voteCount desc
    // should place songB first, songA last.
    await request(app).post(`/api/votes/${songB_id}`).send({ visitorFingerprint: 'fp-1' });

    const queue = await ActiveQueue.find({ venueId }).populate('songId').sort({ voteCount: -1 });
    expect(queue.length).toBe(2);
    expect(queue[0].songId._id.toString()).toBe(songB_id);
    expect(queue[queue.length - 1].songId._id.toString()).toBe(songA_id);
    expect(queue[queue.length - 1].voteCount).toBe(0);
  });
});

// ─── BVA-PW: Register password length boundaries ───────────────────────
describe('BVA-PW: register password length boundaries', () => {
  test('BVA-PW-01: empty password "" (below min) → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'pw01@x.com', password: '', venueName: 'V' });
    expect(res.status).toBe(400);
  });

  test('BVA-PW-02: 1-char password "a" (accepted — no length check in current code)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'pw02@x.com', password: 'a', venueName: 'V' });
    expect(res.status).toBe(201);
  });
});
