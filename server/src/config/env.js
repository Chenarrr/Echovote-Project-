require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (NODE_ENV === 'test' ? 'fallback_dev_secret' : '');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set for non-test environments');
}

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/echovote',
  JWT_SECRET,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV,
};
