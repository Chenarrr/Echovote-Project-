const express = require('express');
const Song = require('../models/Song');
const ActiveQueue = require('../models/ActiveQueue');
const Venue = require('../models/Venue');
const { searchYouTube } = require('../services/youtubeService');
const { emitToVenue } = require('../services/socketManager');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query param q is required' });
    const results = await searchYouTube(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    const queue = await ActiveQueue.find({ venueId })
      .populate('songId')
      .sort({ voteCount: -1 });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { youtubeId, title, thumbnail, artist, addedBy, isExplicit = false } = req.body;

    if (!youtubeId || !title) {
      return res.status(400).json({ error: 'youtubeId and title are required' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    if (venue.settings.explicitFilter && isExplicit) {
      return res.status(403).json({ error: 'Explicit songs are not allowed at this venue' });
    }

    const existing = await ActiveQueue.findOne({ venueId }).populate({
      path: 'songId',
      match: { youtubeId },
    });
    if (existing && existing.songId) {
      return res.status(409).json({ error: 'Song already in queue' });
    }

    const song = await Song.create({ youtubeId, title, thumbnail, artist, addedBy, isExplicit, venueId });
    const queueEntry = await ActiveQueue.create({ songId: song._id, venueId });

    const queue = await ActiveQueue.find({ venueId }).populate('songId').sort({ voteCount: -1 });
    emitToVenue(venueId, 'queue_updated', { queue });

    res.status(201).json({ song, queueEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
