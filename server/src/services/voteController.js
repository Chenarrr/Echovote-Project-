const ActiveQueue = require('../models/ActiveQueue');
const { emitToVenue } = require('./socketManager');

const castVote = async (songId, fingerprint, venueId) => {
  // Atomic: only updates if fingerprint not already present. Prevents
  // read-modify-write races under concurrent votes on the same song.
  const entry = await ActiveQueue.findOneAndUpdate(
    { songId, venueId, voterFingerprints: { $ne: fingerprint } },
    { $push: { voterFingerprints: fingerprint }, $inc: { voteCount: 1 } },
    { new: true }
  );

  if (!entry) {
    const exists = await ActiveQueue.findOne({ songId, venueId });
    if (!exists) throw new Error('Song not in active queue');
    throw new Error('Already voted for this song');
  }

  emitToVenue(venueId, 'update_tally', { songId, newCount: entry.voteCount });

  const queue = await ActiveQueue.find({ venueId })
    .populate('songId')
    .sort({ voteCount: -1 });

  emitToVenue(venueId, 'queue_updated', { queue });

  return entry;
};

const undoVote = async (songId, fingerprint, venueId) => {
  // Atomic: only updates if fingerprint is present. Prevents double-undo
  // races and keeps voteCount in sync with voterFingerprints.length.
  const entry = await ActiveQueue.findOneAndUpdate(
    { songId, venueId, voterFingerprints: fingerprint },
    { $pull: { voterFingerprints: fingerprint }, $inc: { voteCount: -1 } },
    { new: true }
  );

  if (!entry) {
    const exists = await ActiveQueue.findOne({ songId, venueId });
    if (!exists) throw new Error('Song not in active queue');
    throw new Error('You have not voted for this song');
  }

  // Defensive floor in case historical data has voteCount < fingerprints.length
  if (entry.voteCount < 0) {
    entry.voteCount = 0;
    await entry.save();
  }

  emitToVenue(venueId, 'update_tally', { songId, newCount: entry.voteCount });

  const queue = await ActiveQueue.find({ venueId })
    .populate('songId')
    .sort({ voteCount: -1 });

  emitToVenue(venueId, 'queue_updated', { queue });

  return entry;
};

module.exports = { castVote, undoVote };
