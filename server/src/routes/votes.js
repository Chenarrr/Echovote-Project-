const express = require('express');
const { castVote } = require('../services/voteController');
const ActiveQueue = require('../models/ActiveQueue');
const { voteLimiter } = require('../middleware/rateLimiter');
const { emitToVenue } = require('../services/socketManager');

const router = express.Router();

router.post('/:songId', voteLimiter, async (req, res) => {
  try {
    const { songId } = req.params;
    const { visitorFingerprint } = req.body;

    if (!visitorFingerprint) {
      return res.status(400).json({ error: 'visitorFingerprint is required' });
    }

    const entry = await ActiveQueue.findOne({ songId });
    if (!entry) return res.status(404).json({ error: 'Song not in active queue' });

    const result = await castVote(songId, visitorFingerprint, entry.venueId.toString());
    res.json({ voteCount: result.voteCount });
  } catch (err) {
    if (err.message === 'Already voted for this song') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { visitorFingerprint } = req.body;

    if (!visitorFingerprint) {
      return res.status(400).json({ error: 'visitorFingerprint is required' });
    }

    const entry = await ActiveQueue.findOne({ songId });
    if (!entry) return res.status(404).json({ error: 'Song not in active queue' });

    const idx = entry.voterFingerprints.indexOf(visitorFingerprint);
    if (idx === -1) return res.status(400).json({ error: 'You have not voted for this song' });

    entry.voterFingerprints.splice(idx, 1);
    entry.voteCount = Math.max(0, entry.voteCount - 1);
    await entry.save();

    emitToVenue(entry.venueId.toString(), 'update_tally', { songId, newCount: entry.voteCount });

    const queue = await ActiveQueue.find({ venueId: entry.venueId })
      .populate('songId')
      .sort({ voteCount: -1 });
    emitToVenue(entry.venueId.toString(), 'queue_updated', { queue });

    res.json({ voteCount: entry.voteCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
