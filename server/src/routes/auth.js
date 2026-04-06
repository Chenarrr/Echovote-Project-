const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Admin = require('../models/Admin');
const Venue = require('../models/Venue');
const PlaybackState = require('../models/PlaybackState');
const { JWT_SECRET } = require('../config/env');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, async (req, res) => {
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

    const secret = speakeasy.generateSecret({
      name: `EchoVote (${email})`,
      issuer: 'EchoVote',
    });

    const admin = await Admin.create({
      email,
      passwordHash,
      venueId: venue._id,
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    });

    await PlaybackState.create({ venueId: venue._id, isPlaying: false });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({
      setupRequired: true,
      qrCode: qrDataUrl,
      secret: secret.base32,
      email: admin.email,
      venueId: venue._id,
      venueName: venue.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-2fa-setup', async (req, res) => {
  try {
    const { email, token: totpToken } = req.body;
    if (!email || !totpToken) {
      return res.status(400).json({ error: 'email and token are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.twoFactorSecret) {
      return res.status(400).json({ error: 'No 2FA setup found' });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid code. Try again.' });
    }

    admin.twoFactorEnabled = true;
    await admin.save();

    const jwtToken = jwt.sign({ adminId: admin._id, venueId: admin.venueId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token: jwtToken, venueId: admin.venueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.twoFactorEnabled) {
      if (!totpCode) {
        return res.json({ requires2FA: true });
      }

      const verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    const token = jwt.sign({ adminId: admin._id, venueId: admin.venueId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, venueId: admin.venueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
