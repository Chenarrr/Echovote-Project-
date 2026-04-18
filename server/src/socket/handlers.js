const registerHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_venue', ({ venueId }) => {
      socket.join(`venue:${venueId}`);
      console.log(`Socket ${socket.id} joined venue:${venueId}`);
    });

    socket.on('cast_vote', () => {
      // Voting is intentionally handled only via the HTTP API so the
      // request passes through the rate limiter and the same validation path.
      socket.emit('vote_error', { error: 'Socket voting is disabled. Use the HTTP vote API.' });
    });

    socket.on('progress_update', ({ venueId, currentTime, duration }) => {
      socket.to(`venue:${venueId}`).emit('playback_progress', { currentTime, duration });
    });

    socket.on('song_reaction', ({ venueId, reaction, fingerprint }) => {
      io.to(`venue:${venueId}`).emit('reaction_update', { reaction, fingerprint });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { registerHandlers };
