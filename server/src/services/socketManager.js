let io;

const init = (socketIo) => {
  io = socketIo;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToVenue = (venueId, event, data) => {
  getIo().to(`venue:${venueId}`).emit(event, data);
};

module.exports = { init, getIo, emitToVenue };
