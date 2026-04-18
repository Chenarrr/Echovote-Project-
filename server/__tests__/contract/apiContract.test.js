// API Contract tests: asserts the HTTP status codes and minimum response
// shape for every externally-facing endpoint. This suite is the "is the API
// still honouring its published contract?" check.
//
// Unlike IT-*, these tests treat every endpoint as an opaque contract —
// they do not care about side effects or DB state beyond what's needed
// to reach the expected code path.

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

jest.mock('axios');

const axios = require('axios');
const request = require('supertest');
const speakeasy = require('speakeasy');
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

const EMAIL = 'contract@ev.com';
const PASS = 'pw-contract';

// Register + verify 2FA + login, return { token, venueId, secret }
const provisionAdmin = async (venueName = 'Contract Venue') => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: EMAIL, password: PASS, venueName });
  const { secret, venueId, setupToken } = reg.body;
  const setupCode = speakeasy.totp({ secret, encoding: 'base32' });
  const setup = await request(app)
    .post('/api/auth/verify-2fa-setup')
    .send({ setupToken, token: setupCode });
  return { token: setup.body.token, venueId, secret };
};

// --- AUTH -----------------------------------------------------------------

// API-01
test('API-01: POST /api/auth/register valid -> 201 with qrCode+secret', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'a1@ev.com', password: 'pw', venueName: 'V1' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ setupRequired: true });
  expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
  expect(typeof res.body.secret).toBe('string');
  expect(typeof res.body.setupToken).toBe('string');
});

// API-02
test('API-02: POST /api/auth/login valid creds + TOTP -> 200 with token', async () => {
  const { secret } = await provisionAdmin('V2');
  const code = speakeasy.totp({ secret, encoding: 'base32' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: EMAIL, password: PASS, totpCode: code });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeTruthy();
});

// API-03
test('API-03: POST /api/auth/login wrong password -> 401', async () => {
  await provisionAdmin('V3');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: EMAIL, password: 'nope' });
  expect(res.status).toBe(401);
  expect(res.body.error).toMatch(/invalid/i);
});

// --- SONGS ----------------------------------------------------------------

// API-04
test('API-04: GET /api/songs/search?q=test -> 200 with array', async () => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/search')) {
      return Promise.resolve({
        data: {
          items: [
            {
              id: { videoId: 'abc' },
              snippet: {
                title: 'Song',
                channelTitle: 'Ch',
                thumbnails: { medium: { url: 'https://ex.com/t.jpg' } },
              },
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { items: [] } });
  });
  const res = await request(app).get('/api/songs/search?q=test');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

// API-05
test('API-05: POST /api/songs/:venueId valid -> 201', async () => {
  const venue = await Venue.create({ name: 'V5', qrCodeSecret: `s-${Date.now()}` });
  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'yt-5', title: 'T5' });
  expect(res.status).toBe(201);
  expect(res.body.song.youtubeId).toBe('yt-5');
});

// API-06
test('API-06: POST /api/songs/:venueId explicit + filter ON -> 403', async () => {
  const venue = await Venue.create({
    name: 'V6',
    qrCodeSecret: `s-${Date.now()}`,
    settings: { explicitFilter: true },
  });
  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'yt-6', title: 'T6', isExplicit: true });
  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/explicit/i);
});

// API-07
test('API-07: POST /api/songs/:venueId 3rd song from same fingerprint -> 403', async () => {
  const venue = await Venue.create({ name: 'V7', qrCodeSecret: `s-${Date.now()}` });
  await request(app).post(`/api/songs/${venue._id}`).send({ youtubeId: 'y1', title: 't1', addedBy: 'fp-7' });
  await request(app).post(`/api/songs/${venue._id}`).send({ youtubeId: 'y2', title: 't2', addedBy: 'fp-7' });
  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y3', title: 't3', addedBy: 'fp-7' });
  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/up to 2/i);
});

// API-08
test('API-08: DELETE /api/songs/:venueId/:songId own song -> 200', async () => {
  const venue = await Venue.create({ name: 'V8', qrCodeSecret: `s-${Date.now()}` });
  const add = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y8', title: 't8', addedBy: 'fp-8' });
  const songId = add.body.song._id;
  const res = await request(app)
    .delete(`/api/songs/${venue._id}/${songId}`)
    .send({ fingerprint: 'fp-8' });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

// API-09
test("API-09: DELETE /api/songs/:venueId/:songId other user's song -> 403", async () => {
  const venue = await Venue.create({ name: 'V9', qrCodeSecret: `s-${Date.now()}` });
  const add = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y9', title: 't9', addedBy: 'fp-owner' });
  const songId = add.body.song._id;
  const res = await request(app)
    .delete(`/api/songs/${venue._id}/${songId}`)
    .send({ fingerprint: 'fp-stranger' });
  expect(res.status).toBe(403);
});

// --- VOTES ----------------------------------------------------------------

const setupQueueSong = async () => {
  const venue = await Venue.create({ name: 'VV', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-vt', title: 'VT', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });
  return { venue, song };
};

// API-10
test('API-10: POST /api/votes/:songId valid vote -> 200', async () => {
  const { song } = await setupQueueSong();
  const res = await request(app)
    .post(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-10' });
  expect(res.status).toBe(200);
  expect(res.body.voteCount).toBe(1);
});

// API-11
test('API-11: DELETE /api/votes/:songId undo after voting -> 200', async () => {
  const { song } = await setupQueueSong();
  await request(app).post(`/api/votes/${song._id}`).send({ visitorFingerprint: 'fp-11' });
  const res = await request(app)
    .delete(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-11' });
  expect(res.status).toBe(200);
  expect(res.body.voteCount).toBe(0);
});

// API-12
test('API-12: DELETE /api/votes/:songId without prior vote -> 400', async () => {
  const { song } = await setupQueueSong();
  const res = await request(app)
    .delete(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'fp-12-never-voted' });
  expect(res.status).toBe(400);
});

// --- ADMIN ----------------------------------------------------------------

// API-13
test('API-13: POST /api/admin/play-now -> 200 with song in body', async () => {
  const { token } = await provisionAdmin('V13');
  const res = await request(app)
    .post('/api/admin/play-now')
    .set('Authorization', `Bearer ${token}`)
    .send({ youtubeId: 'yt-13', title: 'Played' });
  expect(res.status).toBe(200);
  expect(res.body.song.youtubeId).toBe('yt-13');
});

// API-14
test('API-14: DELETE /api/admin/queue/:songId -> 200 with success:true', async () => {
  const { token, venueId } = await provisionAdmin('V14');
  const song = await Song.create({ youtubeId: 'yt-14', title: 'Q', venueId });
  await ActiveQueue.create({ songId: song._id, venueId });
  const res = await request(app)
    .delete(`/api/admin/queue/${song._id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

// API-15
test('API-15: DELETE /api/admin/venue -> 200 with success:true', async () => {
  const { token } = await provisionAdmin('V15');
  const res = await request(app)
    .delete('/api/admin/venue')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

// --- QR -------------------------------------------------------------------

// API-16
test('API-16: GET /api/qr/:venueId -> 200 with image/png body', async () => {
  const venue = await Venue.create({ name: 'V16', qrCodeSecret: `s-${Date.now()}` });
  const res = await request(app).get(`/api/qr/${venue._id}`);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/image\/png/);
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
});
