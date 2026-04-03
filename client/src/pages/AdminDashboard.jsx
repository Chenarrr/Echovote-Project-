import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSkip, adminPause, adminFilter, adminSeed, getAdminVenue, uploadVenueImage } from '../services/api';
import useVenue from '../hooks/useVenue';
import QRDisplay from '../components/QRDisplay';
import useSocket from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const venueId = localStorage.getItem('echovote_venueId');
  const { queue, nowPlaying, loading } = useVenue(venueId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [venue, setVenue] = useState(null);
  const [uploading, setUploading] = useState(false);
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);

  useSocket(venueId, {
    playback_state: ({ isPlaying: p }) => setIsPlaying(p),
    now_playing: ({ song }) => {
      if (song && playerInstanceRef.current) {
        playerInstanceRef.current.loadVideoById(song.youtubeId);
      }
    },
  });

  useEffect(() => {
    if (!venueId) { navigate('/admin/login'); return; }

    getAdminVenue().then(({ data }) => setVenue(data)).catch(() => {});

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerInstanceRef.current = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: nowPlaying?.youtubeId || '',
        playerVars: { autoplay: 1, controls: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              adminSkip().catch(console.error);
            }
          },
        },
      });
    };
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await uploadVenueImage(formData);
      setVenue((prev) => ({ ...prev, image: data.image }));
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('echovote_token');
    localStorage.removeItem('echovote_venueId');
    navigate('/admin/login');
  };

  const handleSkip = async () => {
    try { await adminSkip(); } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handlePause = async () => {
    try { const { data } = await adminPause(); setIsPlaying(data.isPlaying); } catch (err) { alert(err.message); }
  };

  const handleFilter = async () => {
    try { await adminFilter(); } catch (err) { alert(err.message); }
  };

  const handleSeed = async () => {
    const seeds = seedInput.split(',').map((s) => s.trim()).filter(Boolean);
    try { await adminSeed(seeds); setSeedInput(''); alert('Seeds updated'); } catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Top bar */}
      <header className="border-b border-surface-700/50 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {venue?.image ? (
              <img src={`${API_URL}${venue.image}`} alt={venue?.name} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent">
                  <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                </svg>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-surface-100">{venue?.name || 'EchoVote'}</span>
              <span className="text-surface-600 text-xs">|</span>
              <span className="text-xs text-surface-400">Dashboard</span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-surface-400 hover:text-surface-200 transition-colors font-medium">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {/* Venue Image */}
        <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Venue Photo</h2>
          <div className="flex items-center gap-4">
            {venue?.image ? (
              <img src={`${API_URL}${venue.image}`} alt={venue?.name} className="w-20 h-20 rounded-lg object-cover" />
            ) : (
              <div className="w-20 h-20 bg-surface-800 rounded-lg flex items-center justify-center border border-dashed border-surface-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-surface-500">
                  <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-surface-700/60 hover:bg-surface-700 text-surface-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : venue?.image ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-xs text-surface-500 mt-1.5">JPG or PNG, max 5MB. Shown to guests on the voting page.</p>
            </div>
          </div>
        </div>

        {/* Player + QR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-surface-800/60 border border-surface-700/50 rounded-lg overflow-hidden" style={{ minHeight: 280 }}>
            <div ref={playerRef} className="w-full h-full" style={{ minHeight: 280 }} />
          </div>
          <QRDisplay venueId={venueId} />
        </div>

        {/* Controls */}
        <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Playback Controls</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSkip} className="inline-flex items-center gap-2 bg-surface-700/60 hover:bg-surface-700 text-surface-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M15.25 5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75zm-10.324.614a.75.75 0 011.074.066L10.5 10l-4.5 4.32a.75.75 0 11-1.04-1.08L8.42 10 4.96 6.76a.75.75 0 01.066-1.074l-.1-.072z" />
              </svg>
              Skip track
            </button>
            <button onClick={handlePause} className="inline-flex items-center gap-2 bg-surface-700/60 hover:bg-surface-700 text-surface-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
              {isPlaying ? 'Pause' : 'Resume'}
            </button>
            <button onClick={handleFilter} className="inline-flex items-center gap-2 bg-surface-700/60 hover:bg-surface-700 text-surface-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
              </svg>
              Toggle explicit filter
            </button>
          </div>
        </div>

        {/* Seed playlist */}
        <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Seed Playlist</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="YouTube video IDs, comma separated..."
              className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3.5 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent transition-colors"
            />
            <button onClick={handleSeed} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              Save
            </button>
          </div>
        </div>

        {/* Live Queue */}
        <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Live Queue</h2>
            {queue.length > 0 && (
              <span className="text-xs text-surface-500">{queue.length} {queue.length === 1 ? 'track' : 'tracks'}</span>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <p className="text-surface-500 text-sm text-center py-10">No tracks in queue. Guests can add songs from the venue page.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {queue.map((entry, i) => {
                const song = entry.songId || {};
                return (
                  <div key={entry._id} className="flex items-center gap-3 bg-surface-800/80 rounded-lg p-3 hover:bg-surface-700/50 transition-colors">
                    <span className="text-surface-500 text-xs font-semibold w-5 text-center tabular-nums">{i + 1}</span>
                    <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate" dangerouslySetInnerHTML={{ __html: song.title }} />
                      <p className="text-xs text-surface-400 truncate mt-0.5">{song.artist}</p>
                    </div>
                    <span className="text-accent text-xs font-semibold tabular-nums">{entry.voteCount}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
