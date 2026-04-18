const express = require('express');
const Admin = require('../models/Admin');
const Venue = require('../models/Venue');
const Song = require('../models/Song');
const ActiveQueue = require('../models/ActiveQueue');
const superAdminAuth = require('../middleware/superAdminAuth');
const { superAdminLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/stats', superAdminLimiter, superAdminAuth, async (req, res) => {
  try {
    const [adminCount, venueCount, venues, admins, queueStats, globalUsers] = await Promise.all([
      Admin.countDocuments(),
      Venue.countDocuments(),
      Venue.find().select('_id name createdAt').lean(),
      Admin.aggregate([
        { $group: { _id: '$venueId', count: { $sum: 1 }, twoFactorCount: { $sum: { $cond: ['$twoFactorEnabled', 1, 0] } } } },
      ]),
      ActiveQueue.aggregate([
        { $group: {
          _id: '$venueId',
          songs: { $sum: 1 },
          users: { $addToSet: '$voterFingerprints' },
        } },
        { $project: {
          songs: 1,
          uniqueUsers: { $size: { $reduce: {
            input: '$users',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] },
          } } },
        } },
      ]),
      ActiveQueue.aggregate([
        { $unwind: '$voterFingerprints' },
        { $group: { _id: '$voterFingerprints' } },
        { $count: 'total' },
      ]),
    ]);

    const adminMap = new Map(admins.map((a) => [String(a._id), a]));
    const queueMap = new Map(queueStats.map((q) => [String(q._id), q]));

    const perVenue = venues.map((v) => {
      const a = adminMap.get(String(v._id)) || { count: 0, twoFactorCount: 0 };
      const q = queueMap.get(String(v._id)) || { songs: 0, uniqueUsers: 0 };
      return {
        venueId: String(v._id),
        name: v.name,
        createdAt: v.createdAt,
        admins: a.count,
        twoFactorEnabled: a.twoFactorCount,
        songsInQueue: q.songs,
        uniqueUsers: q.uniqueUsers,
      };
    });

    res.json({
      totals: {
        admins: adminCount,
        venues: venueCount,
        uniqueUsers: globalUsers[0]?.total || 0,
        totalSongs: await Song.countDocuments(),
      },
      venues: perVenue,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
