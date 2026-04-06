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

venueSchema.pre('findOneAndDelete', async function () {
  const venue = await this.model.findOne(this.getFilter());
  if (venue) {
    const Admin = mongoose.model('Admin');
    await Admin.deleteMany({ venueId: venue._id });
  }
});

module.exports = mongoose.model('Venue', venueSchema);
