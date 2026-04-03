const mongoose = require('mongoose');

const playbackStateSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, unique: true },
  currentSongId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', default: null },
  progress: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PlaybackState', playbackStateSchema);
