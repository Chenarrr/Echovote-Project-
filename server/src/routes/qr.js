const express = require('express');
const QRCode = require('qrcode');
const Venue = require('../models/Venue');
const { CLIENT_ORIGIN } = require('../config/env');

const router = express.Router();

router.get('/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const url = `${CLIENT_ORIGIN}/venue/${venueId}`;
    const png = await QRCode.toBuffer(url, { type: 'png', width: 300 });

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
