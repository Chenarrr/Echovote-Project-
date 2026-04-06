const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const PlaybackState = require('../models/PlaybackState');
const ActiveQueue = require('../models/ActiveQueue');
const Song = require('../models/Song');
const Venue = require('../models/Venue');
const { emitToVenue } = require('../services/socketManager');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `venue-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.use(authMiddleware);

router.post('/skip', async (req, res) => {
  try {
    const { venueId } = req.admin;
    let playback = await PlaybackState.findOne({ venueId }).populate('currentSongId');
    if (!playback) {
      playback = await PlaybackState.create({ venueId, isPlaying: false });
    }

    if (playback.currentSongId) {
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
      { new: true, upsert: true }
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

router.post('/play-now', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const { youtubeId, title, thumbnail, artist, isExplicit = false } = req.body;

    if (!youtubeId || !title) return res.status(400).json({ error: 'youtubeId and title are required' });

    const song = await Song.create({ youtubeId, title, thumbnail, artist, isExplicit, venueId });

    let playback = await PlaybackState.findOne({ venueId });
    if (!playback) playback = await PlaybackState.create({ venueId, isPlaying: false });

    playback.currentSongId = song._id;
    playback.progress = 0;
    playback.isPlaying = true;
    await playback.save();

    emitToVenue(venueId, 'now_playing', { song });
    res.json({ song });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/queue/:songId', async (req, res) => {
  try {
    const { venueId } = req.admin;
    const { songId } = req.params;

    await ActiveQueue.deleteOne({ songId, venueId });
    await Song.deleteOne({ _id: songId, venueId });

    const queue = await ActiveQueue.find({ venueId }).populate('songId').sort({ voteCount: -1 });
    emitToVenue(venueId, 'queue_updated', { queue });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/venue', async (req, res) => {
  try {
    const { venueId } = req.admin;

    // Delete all queue entries, songs, and playback state for this venue
    await ActiveQueue.deleteMany({ venueId });
    await Song.deleteMany({ venueId });
    await PlaybackState.deleteMany({ venueId });

    // Delete venue — pre hook in Venue.js auto-deletes the linked admin
    await Venue.findOneAndDelete({ _id: venueId });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
