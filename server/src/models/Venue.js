const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qrCodeSecret: { type: String, required: true, unique: true },
  image: { type: String, default: null },
  settings: {
    explicitFilter: { type: Boolean, default: false },
    weeklySeeds: [{ type: String }],
  },
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);
