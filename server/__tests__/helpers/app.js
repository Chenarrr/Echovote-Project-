const express = require('express');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../src/routes/auth'));
  app.use('/api/songs', require('../../src/routes/songs'));
  app.use('/api/votes', require('../../src/routes/votes'));
  app.use('/api/admin', require('../../src/routes/admin'));
  return app;
};

module.exports = { createApp };
