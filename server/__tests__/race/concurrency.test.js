// Concurrency / race tests.
//
// These fire multiple simultaneous requests and assert invariants that
// can only hold if the underlying code is race-safe. Before the
// voteController refactor to atomic findOneAndUpdate, RACE-01 would
// produce voteCount < voterFingerprints.length under concurrent votes.

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

const request = require('supertest');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');
const PlaybackState = require('../../src/models/PlaybackState');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// RACE-01
test('RACE-01: 10 concurrent votes from distinct fingerprints on same song -> voteCount === voterFingerprints.length', async () => {
  const venue = await Venue.create({ name: 'Race', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-race', title: 'Race', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });

  const promises = Array.from({ length: 10 }, (_, i) =>
    request(app)
      .post(`/api/votes/${song._id}`)
      .send({ visitorFingerprint: `fp-${i}` })
  );
  const results = await Promise.all(promises);
  const ok = results.filter((r) => r.status === 200);
  expect(ok.length).toBe(10);

  const entry = await ActiveQueue.findOne({ songId: song._id });
  expect(entry.voteCount).toBe(10);
  expect(entry.voterFingerprints.length).toBe(10);
  expect(new Set(entry.voterFingerprints).size).toBe(10);
});

// RACE-02
test('RACE-02: same fingerprint voting twice in parallel -> exactly one 200 and one 409', async () => {
  const venue = await Venue.create({ name: 'Race2', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-race2', title: 'Race2', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });

  const [a, b] = await Promise.all([
    request(app).post(`/api/votes/${song._id}`).send({ visitorFingerprint: 'same-fp' }),
    request(app).post(`/api/votes/${song._id}`).send({ visitorFingerprint: 'same-fp' }),
  ]);

  const codes = [a.status, b.status].sort();
  expect(codes).toEqual([200, 409]);

  const entry = await ActiveQueue.findOne({ songId: song._id });
  expect(entry.voteCount).toBe(1);
  expect(entry.voterFingerprints).toEqual(['same-fp']);
});

// RACE-03
test('RACE-03: admin skip racing with a vote on the about-to-be-skipped song -> no orphan/inconsistent state', async () => {
  const venue = await Venue.create({ name: 'Race3', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-race3', title: 'Race3', venueId: venue._id });
  const qe = await ActiveQueue.create({ songId: song._id, venueId: venue._id });
  await PlaybackState.create({
    venueId: venue._id,
    currentSongId: song._id,
    isPlaying: true,
  });

  // Race: one voter hits the song at the exact moment admin logic would
  // remove it from the active queue. We simulate "admin removed it" by
  // calling DELETE /api/admin/queue (directly via model) at t=0, and
  // firing a vote at t=0 too.
  const votePromise = request(app)
    .post(`/api/votes/${song._id}`)
    .send({ visitorFingerprint: 'race3-fp' });
  const removePromise = ActiveQueue.deleteOne({ _id: qe._id });

  const [voteRes] = await Promise.all([votePromise, removePromise]);

  // Either the vote landed before the delete (200) or after (404).
  // Both are acceptable — the invariant is that we never see 500 or a
  // ghost entry with a fingerprint but no queue row.
  expect([200, 404]).toContain(voteRes.status);

  const ghost = await ActiveQueue.findOne({ songId: song._id });
  if (voteRes.status === 200) {
    expect(ghost).not.toBeNull();
    expect(ghost.voteCount).toBe(1);
  } else {
    expect(ghost).toBeNull();
  }
});
