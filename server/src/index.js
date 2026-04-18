const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const { PORT, CLIENT_ORIGIN } = require('./config/env');
const socketManager = require('./services/socketManager');
const { registerHandlers } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const qrRoutes = require('./routes/qr');

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

app.use(compression());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);

const Venue = require('./models/Venue');
app.get('/api/venue/:venueId', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId).select('name image');
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
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
