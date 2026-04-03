const mongoose = require('mongoose');

const activeQueueSchema = new mongoose.Schema({
  songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
  voteCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  voterFingerprints: [{ type: String }],
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
}, { timestamps: true });

module.exports = mongoose.model('ActiveQueue', activeQueueSchema);
