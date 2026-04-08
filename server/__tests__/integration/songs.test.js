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
const request = require('supertest');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// IT-06
test('IT-06: GET /api/songs/search returns mapped array with isExplicit', async () => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/search')) {
      return Promise.resolve({
        data: {
          items: [
            {
              id: { videoId: 'vid1' },
              snippet: {
                title: 'Song One',
                channelTitle: 'Artist',
                thumbnails: { medium: { url: 'https://ex.com/1.jpg' } },
              },
            },
            {
              id: { videoId: 'vid2' },
              snippet: {
                title: 'Song Two',
                channelTitle: 'Artist',
                thumbnails: { medium: { url: 'https://ex.com/2.jpg' } },
              },
            },
          ],
        },
      });
    }
    if (url.includes('/videos')) {
      return Promise.resolve({ data: { items: [] } });
    }
  });

  const res = await request(app).get('/api/songs/search').query({ q: 'test' });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  expect(res.body[0]).toHaveProperty('youtubeId');
  expect(res.body[0]).toHaveProperty('title');
  expect(res.body[0]).toHaveProperty('isExplicit');
});

// IT-07
test('IT-07: POST /api/songs/:venueId creates new song and returns 201 with song+queueEntry', async () => {
  const venue = await Venue.create({ name: 'V7', qrCodeSecret: `s-${Date.now()}` });

  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'yt-it07', title: 'Title 7', artist: 'A', addedBy: 'fp-07' });

  expect(res.status).toBe(201);
  expect(res.body.song).toBeDefined();
  expect(res.body.song.youtubeId).toBe('yt-it07');
  expect(res.body.queueEntry).toBeDefined();
});

// IT-08
test('IT-08: POST /api/songs/:venueId with duplicate youtubeId returns 409', async () => {
  const venue = await Venue.create({ name: 'V8', qrCodeSecret: `s-${Date.now()}` });

  await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'dup-yt', title: 'Dup', addedBy: 'fp-08a' });

  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'dup-yt', title: 'Dup2', addedBy: 'fp-08b' });

  expect(res.status).toBe(409);
  expect(res.body.error).toBe('Song already in queue');
});

// IT-09
test('IT-09: POST /api/songs/:venueId explicit song with filter ON returns 403', async () => {
  const venue = await Venue.create({
    name: 'V9',
    qrCodeSecret: `s-${Date.now()}`,
    settings: { explicitFilter: true },
  });

  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'explicit-yt', title: 'E', isExplicit: true, addedBy: 'fp-09' });

  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/Explicit songs are not allowed/);
});

// IT-10
test('IT-10: POST /api/songs/:venueId 3rd song by same fingerprint returns 403', async () => {
  const venue = await Venue.create({ name: 'V10', qrCodeSecret: `s-${Date.now()}` });
  const fp = 'fp-10';

  await request(app).post(`/api/songs/${venue._id}`).send({ youtubeId: 'y1', title: 'T1', addedBy: fp });
  await request(app).post(`/api/songs/${venue._id}`).send({ youtubeId: 'y2', title: 'T2', addedBy: fp });

  const res = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y3', title: 'T3', addedBy: fp });

  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/only add up to 2 songs/);
});

// IT-11
test('IT-11: DELETE /api/songs/:venueId/:songId own song returns 200', async () => {
  const venue = await Venue.create({ name: 'V11', qrCodeSecret: `s-${Date.now()}` });
  const fp = 'fp-11';

  const addRes = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y11', title: 'T11', addedBy: fp });

  const songId = addRes.body.song._id;

  const res = await request(app)
    .delete(`/api/songs/${venue._id}/${songId}`)
    .send({ fingerprint: fp });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

// IT-12
test("IT-12: DELETE /api/songs/:venueId/:songId another user's song returns 403", async () => {
  const venue = await Venue.create({ name: 'V12', qrCodeSecret: `s-${Date.now()}` });

  const addRes = await request(app)
    .post(`/api/songs/${venue._id}`)
    .send({ youtubeId: 'y12', title: 'T12', addedBy: 'fp-owner' });

  const songId = addRes.body.song._id;

  const res = await request(app)
    .delete(`/api/songs/${venue._id}/${songId}`)
    .send({ fingerprint: 'fp-intruder' });

  expect(res.status).toBe(403);
  expect(res.body.error).toBe('You can only remove songs you added');
});
