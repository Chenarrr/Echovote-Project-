const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

socketManager.init(io);
registerHandlers(io);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
