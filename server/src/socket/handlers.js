const { castVote } = require('../services/voteController');
const ActiveQueue = require('../models/ActiveQueue');

const registerHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_venue', ({ venueId }) => {
      socket.join(`venue:${venueId}`);
      console.log(`Socket ${socket.id} joined venue:${venueId}`);
    });

    socket.on('cast_vote', async ({ songId, fingerprint, venueId }) => {
      try {
        await castVote(songId, fingerprint, venueId);
      } catch (err) {
        socket.emit('vote_error', { error: err.message });
      }
    });

    socket.on('progress_update', ({ venueId, currentTime, duration }) => {
      socket.to(`venue:${venueId}`).emit('playback_progress', { currentTime, duration });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { registerHandlers };
