const express = require('express');
const authMiddleware = require('../middleware/auth');
const PlaybackState = require('../models/PlaybackState');
const ActiveQueue = require('../models/ActiveQueue');
const Venue = require('../models/Venue');
const { emitToVenue } = require('../services/socketManager');

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

module.exports = router;
