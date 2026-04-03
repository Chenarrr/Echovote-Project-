import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('echovote_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const searchSongs = (q) => api.get(`/api/songs/search?q=${encodeURIComponent(q)}`);
export const getQueue = (venueId) => api.get(`/api/songs/${venueId}`);
export const addSong = (venueId, song) => api.post(`/api/songs/${venueId}`, song);
export const castVote = (songId, visitorFingerprint) =>
  api.post(`/api/votes/${songId}`, { visitorFingerprint });
export const adminLogin = (email, password) => api.post('/api/auth/login', { email, password });
export const adminRegister = (email, password, venueName) =>
  api.post('/api/auth/register', { email, password, venueName });
export const adminSkip = () => api.post('/api/admin/skip');
export const adminPause = () => api.post('/api/admin/pause');
export const adminFilter = () => api.post('/api/admin/filter');
export const adminSeed = (seeds) => api.post('/api/admin/seed', { seeds });
export const getQrCode = (venueId) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/qr/${venueId}`;

export default api;
