const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  youtubeId: { type: String, required: true },
  title: { type: String, required: true },
  thumbnail: { type: String },
  artist: { type: String },
  voteCount: { type: Number, default: 0 },
  addedBy: { type: String },
  isExplicit: { type: Boolean, default: false },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
