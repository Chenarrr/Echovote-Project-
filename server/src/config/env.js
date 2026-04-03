require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/echovote',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_dev_secret',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
