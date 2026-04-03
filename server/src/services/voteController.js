const ActiveQueue = require('../models/ActiveQueue');
const { emitToVenue } = require('./socketManager');

const castVote = async (songId, fingerprint, venueId) => {
  const entry = await ActiveQueue.findOne({ songId, venueId });

  if (!entry) {
    throw new Error('Song not in active queue');
  }

  if (entry.voterFingerprints.includes(fingerprint)) {
    throw new Error('Already voted for this song');
  }

  entry.voterFingerprints.push(fingerprint);
  entry.voteCount += 1;
  await entry.save();

  emitToVenue(venueId, 'update_tally', { songId, newCount: entry.voteCount });

  const queue = await ActiveQueue.find({ venueId })
    .populate('songId')
    .sort({ voteCount: -1 });

  emitToVenue(venueId, 'queue_updated', { queue });

  return entry;
};

module.exports = { castVote };
