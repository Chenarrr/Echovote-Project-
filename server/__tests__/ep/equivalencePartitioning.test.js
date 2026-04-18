// Equivalence Partitioning tests — group inputs into classes that the
// system should treat the same, and verify one representative per class.

jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  voteLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
  searchLimiter: (req, res, next) => next(),
}));

const mongoose = require('mongoose');
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

// ─── EP-VT: Voting fingerprint equivalence classes ─────────────────────
describe('EP-VT: vote fingerprint input classes', () => {
  let songId;

  beforeEach(async () => {
    const venue = await Venue.create({ name: 'V', qrCodeSecret: `s-${Date.now()}` });
    const song = await Song.create({ youtubeId: 'yt-vt', title: 'T', venueId: venue._id });
    songId = song._id.toString();
    await ActiveQueue.create({ songId: song._id, venueId: venue._id });
  });

  test('EP-VT-01: valid fingerprint "abc123def456" → 200, vote counted', async () => {
    const res = await request(app)
      .post(`/api/votes/${songId}`)
      .send({ visitorFingerprint: 'abc123def456' });
    expect(res.status).toBe(200);
    expect(res.body.voteCount).toBe(1);
  });

  test('EP-VT-02: empty string fingerprint → 400', async () => {
    const res = await request(app)
      .post(`/api/votes/${songId}`)
      .send({ visitorFingerprint: '' });
    expect(res.status).toBe(400);
  });

  test('EP-VT-03: undefined fingerprint (field missing) → 400', async () => {
    const res = await request(app).post(`/api/votes/${songId}`).send({});
    expect(res.status).toBe(400);
  });

  test('EP-VT-04: duplicate fingerprint → 409', async () => {
    await request(app).post(`/api/votes/${songId}`).send({ visitorFingerprint: 'abc123' });
    const res = await request(app)
      .post(`/api/votes/${songId}`)
      .send({ visitorFingerprint: 'abc123' });
    expect(res.status).toBe(409);
  });

  test('EP-VT-05: second unique fingerprint → 200, voteCount = 2', async () => {
    await request(app).post(`/api/votes/${songId}`).send({ visitorFingerprint: 'abc123' });
    const res = await request(app)
      .post(`/api/votes/${songId}`)
      .send({ visitorFingerprint: 'xyz789' });
    expect(res.status).toBe(200);
    expect(res.body.voteCount).toBe(2);
  });
});

// ─── EP-SQ: Song-queue POST input classes ──────────────────────────────
describe('EP-SQ: song queue input classes', () => {
  let venueId;

  beforeEach(async () => {
    const venue = await Venue.create({ name: 'SQV', qrCodeSecret: `s-${Date.now()}` });
    venueId = venue._id.toString();
  });

  test('EP-SQ-01: new youtubeId → 201', async () => {
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'fresh-yt', title: 'Fresh', addedBy: 'fp' });
    expect(res.status).toBe(201);
  });

  test('EP-SQ-02: existing youtubeId → 409', async () => {
    await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'dup-yt', title: 'Dup', addedBy: 'fp' });
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'dup-yt', title: 'Dup2', addedBy: 'fp2' });
    expect(res.status).toBe(409);
  });

  test('EP-SQ-03: missing youtubeId → 400', async () => {
    const res = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ title: 'T', addedBy: 'fp' });
    expect(res.status).toBe(400);
  });

  test('EP-SQ-04: invalid (non-existent) venueId → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/songs/${fakeId}`)
      .send({ youtubeId: 'yt', title: 'T', addedBy: 'fp' });
    expect(res.status).toBe(404);
  });
});

// ─── EP-EM: Register email input classes ───────────────────────────────
describe('EP-EM: register email input classes', () => {
  test('EP-EM-01: valid email "admin@venue.com" → 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@venue.com', password: 'pw', venueName: 'V' });
    expect(res.status).toBe(201);
  });

  test('EP-EM-02: empty email → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '', password: 'pw', venueName: 'V' });
    expect(res.status).toBe(400);
  });

  test('EP-EM-03: duplicate email → 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@x.com', password: 'pw', venueName: 'V1' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@x.com', password: 'pw', venueName: 'V2' });
    expect(res.status).toBe(409);
  });
});

// ─── EP-EX: Explicit filter interaction classes ────────────────────────
describe('EP-EX: explicit song + filter interaction', () => {
  test('EP-EX-01: explicit song, filter ON → 403', async () => {
    const venue = await Venue.create({
      name: 'V',
      qrCodeSecret: `s-${Date.now()}`,
      settings: { explicitFilter: true },
    });
    const res = await request(app)
      .post(`/api/songs/${venue._id}`)
      .send({ youtubeId: 'e', title: 'E', isExplicit: true, addedBy: 'fp' });
    expect(res.status).toBe(403);
  });

  test('EP-EX-02: explicit song, filter OFF → 201', async () => {
    const venue = await Venue.create({
      name: 'V',
      qrCodeSecret: `s-${Date.now()}`,
      settings: { explicitFilter: false },
    });
    const res = await request(app)
      .post(`/api/songs/${venue._id}`)
      .send({ youtubeId: 'e', title: 'E', isExplicit: true, addedBy: 'fp' });
    expect(res.status).toBe(201);
  });

  test('EP-EX-03: non-explicit song, filter ON → 201', async () => {
    const venue = await Venue.create({
      name: 'V',
      qrCodeSecret: `s-${Date.now()}`,
      settings: { explicitFilter: true },
    });
    const res = await request(app)
      .post(`/api/songs/${venue._id}`)
      .send({ youtubeId: 'ne', title: 'NE', isExplicit: false, addedBy: 'fp' });
    expect(res.status).toBe(201);
  });
});

// ─── EP-DL: Delete-song fingerprint classes ────────────────────────────
describe('EP-DL: delete song input classes', () => {
  let venueId, songId;

  beforeEach(async () => {
    const venue = await Venue.create({ name: 'DLV', qrCodeSecret: `s-${Date.now()}` });
    venueId = venue._id.toString();
    const add = await request(app)
      .post(`/api/songs/${venueId}`)
      .send({ youtubeId: 'dl-yt', title: 'DL', addedBy: 'owner-fp' });
    songId = add.body.song._id;
  });

  test('EP-DL-01: matching fingerprint (owner) → 200', async () => {
    const res = await request(app)
      .delete(`/api/songs/${venueId}/${songId}`)
      .send({ fingerprint: 'owner-fp' });
    expect(res.status).toBe(200);
  });

  test("EP-DL-02: other user's fingerprint → 403", async () => {
    const res = await request(app)
      .delete(`/api/songs/${venueId}/${songId}`)
      .send({ fingerprint: 'not-owner' });
    expect(res.status).toBe(403);
  });

  test('EP-DL-03: missing fingerprint in body → 400', async () => {
    const res = await request(app).delete(`/api/songs/${venueId}/${songId}`).send({});
    expect(res.status).toBe(400);
  });
});
