const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const PlaybackState = require('../models/PlaybackState');
const ActiveQueue = require('../models/ActiveQueue');
const Venue = require('../models/Venue');
const { emitToVenue } = require('../services/socketManager');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `venue-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.use(authMiddleware);

router.post('/skip', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const playback = await PlaybackState.findOne({ venueId }).populate('currentSongId');

    if (playback && playback.currentSongId) {
      await ActiveQueue.deleteOne({ songId: playback.currentSongId._id, venueId });
    }

    const next = await ActiveQueue.findOne({ venueId }).populate('songId').sort({ voteCount: -1 });

    if (next) {
      playback.currentSongId = next.songId._id;
      playback.progress = 0;
      playback.isPlaying = true;
      await playback.save();
      emitToVenue(venueId, 'now_playing', { song: next.songId });
    } else {
      playback.currentSongId = null;
      playback.isPlaying = false;
      await playback.save();
      emitToVenue(venueId, 'now_playing', { song: null });
    }

    const queue = await ActiveQueue.find({ venueId }).populate('songId').sort({ voteCount: -1 });
    emitToVenue(venueId, 'queue_updated', { queue });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pause', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const playback = await PlaybackState.findOneAndUpdate(
      { venueId },
      [{ $set: { isPlaying: { $not: '$isPlaying' } } }],
      { new: true }
    );
    emitToVenue(venueId, 'playback_state', { isPlaying: playback.isPlaying });
    res.json({ isPlaying: playback.isPlaying });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/filter', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const venue = await Venue.findById(venueId);
    venue.settings.explicitFilter = !venue.settings.explicitFilter;
    await venue.save();
    res.json({ explicitFilter: venue.settings.explicitFilter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const { seeds } = req.body;
    if (!Array.isArray(seeds)) return res.status(400).json({ error: 'seeds must be an array' });
    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { 'settings.weeklySeeds': seeds },
      { new: true }
    );
    res.json({ weeklySeeds: venue.settings.weeklySeeds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/venue-image', upload.single('image'), async (req, res) => {
  try {
    const { venueId } = req.admin;
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const imagePath = `/uploads/${req.file.filename}`;
    const venue = await Venue.findByIdAndUpdate(venueId, { image: imagePath }, { new: true });
    res.json({ image: venue.image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/venue', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
