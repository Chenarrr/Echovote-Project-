const mongoose = require('mongoose');
const { connect, close, clear } = require('../helpers/db');
const Song = require('../../src/models/Song');
const Admin = require('../../src/models/Admin');
const Venue = require('../../src/models/Venue');
const ActiveQueue = require('../../src/models/ActiveQueue');
const PlaybackState = require('../../src/models/PlaybackState');

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// Helpers
const makeVenueId = () => new mongoose.Types.ObjectId();

// UT-10
test('UT-10: Song missing youtubeId fails validation with ValidationError', async () => {
  const song = new Song({ title: 'No ID Song', venueId: makeVenueId() });
  await expect(song.save()).rejects.toThrow(mongoose.Error.ValidationError);
});

// UT-11
test('UT-11: Admin duplicate email fails with code 11000', async () => {
  const venueId = makeVenueId();
  await Admin.create({ email: 'dup@test.com', passwordHash: 'hash1', venueId });
  const dup = new Admin({ email: 'dup@test.com', passwordHash: 'hash2', venueId });
  await expect(dup.save()).rejects.toMatchObject({ code: 11000 });
});

// UT-12
test('UT-12: ActiveQueue voterFingerprints defaults to empty array', async () => {
  const venue = await Venue.create({ name: 'V1', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-1', title: 'Song 1', venueId: venue._id });
  const entry = await ActiveQueue.create({ songId: song._id, venueId: venue._id });
  expect(entry.voterFingerprints).toEqual([]);
});

// UT-16
test('UT-16: Song isExplicit defaults to false', async () => {
  const song = new Song({ youtubeId: 'yt-2', title: 'Song 2', venueId: makeVenueId() });
  expect(song.isExplicit).toBe(false);
});

// UT-17
test('UT-17: Song addedBy stores the fingerprint string', async () => {
  const venue = await Venue.create({ name: 'V2', qrCodeSecret: `s2-${Date.now()}` });
  const song = await Song.create({
    youtubeId: 'yt-3',
    title: 'Song 3',
    venueId: venue._id,
    addedBy: 'fp-fingerprint-xyz',
  });
  expect(song.addedBy).toBe('fp-fingerprint-xyz');
});

// UT-18
test('UT-18: Venue explicitFilter defaults to false', async () => {
  const venue = await Venue.create({ name: 'V3', qrCodeSecret: `s3-${Date.now()}` });
  expect(venue.settings.explicitFilter).toBe(false);
});

// UT-19
test('UT-19: Venue pre-delete hook removes linked admin', async () => {
  const venue = await Venue.create({ name: 'V4', qrCodeSecret: `s4-${Date.now()}` });
  await Admin.create({ email: 'admin19@test.com', passwordHash: 'hash', venueId: venue._id });

  expect(await Admin.countDocuments({ venueId: venue._id })).toBe(1);

  await Venue.findOneAndDelete({ _id: venue._id });

  expect(await Admin.countDocuments({ venueId: venue._id })).toBe(0);
});

// UT-20
test('UT-20: PlaybackState isPlaying defaults to false', async () => {
  const venue = await Venue.create({ name: 'V5', qrCodeSecret: `s5-${Date.now()}` });
  const state = await PlaybackState.create({ venueId: venue._id });
  expect(state.isPlaying).toBe(false);
});

// UT-21
test('UT-21: PlaybackState currentSongId defaults to null', async () => {
  const venue = await Venue.create({ name: 'V6', qrCodeSecret: `s6-${Date.now()}` });
  const state = await PlaybackState.create({ venueId: venue._id });
  expect(state.currentSongId).toBeNull();
});

// UT-24
test('UT-24: ActiveQueue voteCount defaults to 0', async () => {
  const venue = await Venue.create({ name: 'V7', qrCodeSecret: `s7-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'yt-4', title: 'Song 4', venueId: venue._id });
  const entry = await ActiveQueue.create({ songId: song._id, venueId: venue._id });
  expect(entry.voteCount).toBe(0);
});
