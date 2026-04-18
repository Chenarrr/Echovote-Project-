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

    if (addedBy) {
      const userSongs = await Song.find({ venueId, addedBy }, '_id');
      const userSongCount = await ActiveQueue.countDocuments({
        venueId,
        songId: { $in: userSongs.map((s) => s._id) },
      });
      if (userSongCount >= 2) {
        return res.status(403).json({ error: 'You can only add up to 2 songs. Remove one to add another.' });
      }
    }

    const matchingSongs = await Song.find({ venueId, youtubeId }, '_id');
    if (matchingSongs.length > 0) {
      const existingQueueEntry = await ActiveQueue.findOne({
        venueId,
        songId: { $in: matchingSongs.map((song) => song._id) },
      });
      if (existingQueueEntry) {
        return res.status(409).json({ error: 'Song already in queue' });
      }
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

router.delete('/:venueId/:songId', async (req, res) => {
  try {
    const { venueId, songId } = req.params;
    const { fingerprint } = req.body;

    if (!fingerprint) return res.status(400).json({ error: 'fingerprint is required' });

    const song = await Song.findOne({ _id: songId, venueId });
    if (!song) return res.status(404).json({ error: 'Song not found' });

    if (song.addedBy !== fingerprint) {
      return res.status(403).json({ error: 'You can only remove songs you added' });
    }

    await ActiveQueue.deleteOne({ songId: song._id, venueId });
    await Song.deleteOne({ _id: song._id, venueId });

    const queue = await ActiveQueue.find({ venueId }).populate('songId').sort({ voteCount: -1 });
    emitToVenue(venueId, 'queue_updated', { queue });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
