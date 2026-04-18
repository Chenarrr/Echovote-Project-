const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const connectDB = require('./config/db');
const { PORT, CLIENT_ORIGIN } = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiter');
const socketManager = require('./services/socketManager');
const { registerHandlers } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const qrRoutes = require('./routes/qr');
const superAdminRoutes = require('./routes/superAdmin');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

socketManager.init(io);
registerHandlers(io);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use(compression());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(globalLimiter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/super-admin', superAdminRoutes);

const Venue = require('./models/Venue');
const PlaybackState = require('./models/PlaybackState');
app.get('/api/venue/:venueId', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId).select('name image');
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    const playback = await PlaybackState.findOne({ venueId: venue._id }).populate('currentSongId');
    res.json({
      _id: venue._id,
      name: venue.name,
      image: venue.image,
      nowPlaying: playback?.currentSongId || null,
      isPlaying: playback?.isPlaying || false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
