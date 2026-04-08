// Mock socket manager before any imports that trigger it
jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

const mongoose = require('mongoose');
const { connect, close, clear } = require('../helpers/db');
const { castVote, undoVote } = require('../../src/services/voteController');
const ActiveQueue = require('../../src/models/ActiveQueue');
const Song = require('../../src/models/Song');
const Venue = require('../../src/models/Venue');

let venueId, songId;

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => {
  await clear();
  const venue = await Venue.create({ name: 'Test Venue', qrCodeSecret: `secret-${Date.now()}` });
  venueId = venue._id.toString();
  const song = await Song.create({ youtubeId: 'yt-abc123', title: 'Test Song', venueId: venue._id });
  songId = song._id.toString();
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });
});

// UT-01
test('UT-01: castVote increments voteCount and stores fingerprint', async () => {
  const entry = await castVote(songId, 'fp-001', venueId);
  expect(entry.voteCount).toBe(1);
  expect(entry.voterFingerprints).toContain('fp-001');
});

// UT-02
test('UT-02: castVote rejects duplicate fingerprint', async () => {
  await castVote(songId, 'fp-001', venueId);
  await expect(castVote(songId, 'fp-001', venueId)).rejects.toThrow('Already voted for this song');
});

// UT-03
test('UT-03: castVote throws for non-existent songId', async () => {
  const fakeSongId = new mongoose.Types.ObjectId().toString();
  await expect(castVote(fakeSongId, 'fp-001', venueId)).rejects.toThrow('Song not in active queue');
});

// UT-13
test('UT-13: undoVote decrements voteCount from 1 to 0', async () => {
  await castVote(songId, 'fp-001', venueId);
  const entry = await undoVote(songId, 'fp-001', venueId);
  expect(entry.voteCount).toBe(0);
});

// UT-14
test('UT-14: undoVote removes fingerprint from voterFingerprints', async () => {
  await castVote(songId, 'fp-001', venueId);
  const entry = await undoVote(songId, 'fp-001', venueId);
  expect(entry.voterFingerprints).not.toContain('fp-001');
});

// UT-15
test('UT-15: undoVote without prior vote throws error', async () => {
  await expect(undoVote(songId, 'fp-001', venueId)).rejects.toThrow('You have not voted for this song');
});
