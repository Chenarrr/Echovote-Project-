const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const PlaybackState = require('../models/PlaybackState');
const ActiveQueue = require('../models/ActiveQueue');
const Song = require('../models/Song');
const Venue = require('../models/Venue');
const { emitToVenue } = require('../services/socketManager');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  if (
    buffer.toString('ascii', 0, 6) === 'GIF87a' ||
    buffer.toString('ascii', 0, 6) === 'GIF89a'
  ) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
};

const uploadSingleImage = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const saveValidatedImage = async (file) => {
  const detectedType = detectImageType(file?.buffer);
  if (!detectedType) {
    throw new Error('Uploaded file content is not a supported image');
  }

  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `venue-${Date.now()}-${crypto.randomUUID()}.${detectedType.ext}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);
  await fs.promises.writeFile(absolutePath, file.buffer);

  return `/uploads/${filename}`;
};

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

router.post('/venue-image', async (req, res) => {
  try {
    await uploadSingleImage(req, res);

    const { venueId } = req.admin;
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const imagePath = await saveValidatedImage(req.file);
    const venue = await Venue.findByIdAndUpdate(venueId, { image: imagePath }, { new: true });
    if (!venue) {
      await fs.promises.rm(path.join(UPLOAD_DIR, path.basename(imagePath)), { force: true });
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({ image: venue.image });
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image file is too large. Max size is 5MB.' });
    }
    if (
      err.message === 'Only image files (JPEG, PNG, WebP, GIF) are allowed' ||
      err.message === 'Uploaded file content is not a supported image'
    ) {
      return res.status(400).json({ error: err.message });
    }

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
