const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Venue = require('../models/Venue');
const { JWT_SECRET } = require('../config/env');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, venueName } = req.body;

    if (!email || !password || !venueName) {
      return res.status(400).json({ error: 'email, password, and venueName are required' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const qrCodeSecret = `${venueName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    const venue = await Venue.create({ name: venueName, qrCodeSecret });

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ email, passwordHash, venueId: venue._id });

    const token = jwt.sign({ adminId: admin._id, venueId: venue._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, venueId: venue._id, venueName: venue.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin._id, venueId: admin.venueId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, venueId: admin.venueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
