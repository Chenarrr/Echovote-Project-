import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSkip, adminPause, adminFilter, adminSeed } from '../services/api';
import useVenue from '../hooks/useVenue';
import QRDisplay from '../components/QRDisplay';
import useSocket from '../hooks/useSocket';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const venueId = localStorage.getItem('echovote_venueId');
  const { queue, nowPlaying, loading } = useVenue(venueId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);

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
    <div className="min-h-screen bg-brand-dark p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition-colors">
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden" style={{ height: 240 }}>
            <div ref={playerRef} className="w-full h-full" />
          </div>
          <QRDisplay venueId={venueId} />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={handleSkip} className="bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            ⏭ Skip
          </button>
          <button onClick={handlePause} className="bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            {isPlaying ? '⏸ Pause Voting' : '▶ Resume Voting'}
          </button>
          <button onClick={handleFilter} className="bg-brand-card border border-brand-border hover:border-brand-purple text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            🔞 Toggle Filter
          </button>
        </div>

        <div className="mb-6">
          <label className="text-xs text-gray-400 mb-2 block">Weekly Seed Playlist (comma-separated YouTube IDs)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="videoId1, videoId2, ..."
              className="flex-1 bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple"
            />
            <button onClick={handleSeed} className="bg-brand-purple hover:bg-violet-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
              Save
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Live Queue</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Queue is empty</p>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map((entry, i) => {
                const song = entry.songId || {};
                return (
                  <div key={entry._id} className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-xl p-3">
                    <span className="text-gray-500 text-sm font-bold w-5 text-center">{i + 1}</span>
                    <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    </div>
                    <span className="text-brand-purple text-sm font-bold">{entry.voteCount} votes</span>
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
