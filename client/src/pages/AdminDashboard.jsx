import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSkip, adminPause, adminFilter, getAdminVenue, uploadVenueImage, deleteVenue, searchSongs, addSong, playNow, adminDeleteSong } from '../services/api';
import useVenue from '../hooks/useVenue';
import QRDisplay from '../components/QRDisplay';
import useSocket from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const venueId = localStorage.getItem('echovote_venueId');
  const { queue, nowPlaying, loading } = useVenue(venueId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [explicitFilter, setExplicitFilter] = useState(false);
  const [venue, setVenue] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [adminQuery, setAdminQuery] = useState('');
  const [adminResults, setAdminResults] = useState([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminAdding, setAdminAdding] = useState(null);
  const [reactions, setReactions] = useState({ fire: 0, meh: 0, dislike: 0 });
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);

  const socket = useSocket(venueId, {
    playback_state: ({ isPlaying: p }) => {
      setIsPlaying(p);
      if (playerInstanceRef.current) {
        p ? playerInstanceRef.current.playVideo() : playerInstanceRef.current.pauseVideo();
      }
    },
    now_playing: ({ song }) => {
      if (song && playerInstanceRef.current) {
        playerInstanceRef.current.loadVideoById(song.youtubeId);
      }
      setReactions({ fire: 0, meh: 0, dislike: 0 });
    },
    reaction_update: ({ reaction }) => {
      setReactions((prev) => ({ ...prev, [reaction]: (prev[reaction] || 0) + 1 }));
    },
  });

  useEffect(() => {
    if (!venueId) { navigate('/admin/login'); return; }

    getAdminVenue().then(({ data }) => {
      setVenue(data);
      setExplicitFilter(data.settings?.explicitFilter || false);
    }).catch(() => {});

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

  useEffect(() => {
    if (nowPlaying && playerInstanceRef.current) {
      playerInstanceRef.current.loadVideoById(nowPlaying.youtubeId);
    }
  }, [nowPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerInstanceRef.current && socket) {
        const currentTime = playerInstanceRef.current.getCurrentTime?.();
        const duration = playerInstanceRef.current.getDuration?.();
        if (currentTime != null && duration) {
          socket.emit('progress_update', { venueId, currentTime, duration });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [venueId, socket]);

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

  const handleDeleteVenue = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${venue?.name}"?\n\nThis will permanently delete the venue, your admin account, all songs, and the entire queue. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteVenue();
      localStorage.removeItem('echovote_token');
      localStorage.removeItem('echovote_venueId');
      navigate('/admin/login');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete venue');
    }
  };

  const handleSkip = async () => {
    try { await adminSkip(); } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handlePause = async () => {
    try {
      const { data } = await adminPause();
      setIsPlaying(data.isPlaying);
      if (playerInstanceRef.current) {
        data.isPlaying ? playerInstanceRef.current.playVideo() : playerInstanceRef.current.pauseVideo();
      }
    } catch (err) { alert(err.message); }
  };

  const handleFilter = async () => {
    try {
      const { data } = await adminFilter();
      setExplicitFilter(data.explicitFilter);
    } catch (err) { alert(err.message); }
  };

  const handleAdminSearch = async (e) => {
    e.preventDefault();
    if (!adminQuery.trim()) return;
    setAdminSearching(true);
    try {
      const { data } = await searchSongs(adminQuery);
      setAdminResults(data);
    } catch { setAdminResults([]); }
    finally { setAdminSearching(false); }
  };

  const handlePlayNow = async (song) => {
    setAdminAdding(song.youtubeId);
    try {
      const { data } = await playNow(song);
      if (playerInstanceRef.current) {
        playerInstanceRef.current.loadVideoById(data.song.youtubeId);
      }
      setIsPlaying(true);
      setAdminResults([]);
      setAdminQuery('');
    } catch (err) { alert(err.response?.data?.error || 'Failed to play'); }
    finally { setAdminAdding(null); }
  };

  const handleAddToQueue = async (song) => {
    setAdminAdding(song.youtubeId);
    try {
      await addSong(venueId, song);
      setAdminResults((prev) => prev.filter((s) => s.youtubeId !== song.youtubeId));
    } catch (err) { alert(err.response?.data?.error || 'Could not add song'); }
    finally { setAdminAdding(null); }
  };

  const handleDeleteQueueSong = async (songId) => {
    try {
      await adminDeleteSong(songId);
    } catch (err) { alert(err.response?.data?.error || 'Failed to remove song'); }
  };

  const totalReactions = reactions.fire + reactions.meh + reactions.dislike;

  return (
    <div className="min-h-screen relative">
      <div className="ambient-bg">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="px-4 lg:px-8 pt-4">
          <div className="max-w-6xl mx-auto glass-heavy rounded-2xl h-14 flex items-center justify-between px-5 float-in">
            <div className="flex items-center gap-3">
              {venue?.image ? (
                <img src={`${API_URL}${venue.image}`} alt={venue?.name} className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(168,85,247,0.2))' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-cyan-400">
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                  </svg>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-gradient">{venue?.name || 'EchoVote'}</span>
                <span className="text-white/10">·</span>
                <span className="text-xs text-white/35 font-medium">Dashboard</span>
              </div>
            </div>
            <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors font-semibold">
              Sign out
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
          {/* Venue Image */}
          <div className="glass rounded-2xl p-5 mb-5 float-in">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Venue Photo</h2>
            <div className="flex items-center gap-4">
              {venue?.image ? (
                <img src={`${API_URL}${venue.image}`} alt={venue?.name} className="w-20 h-20 rounded-2xl object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-20 h-20 glass-subtle rounded-2xl flex items-center justify-center border border-dashed border-white/15">
                  <span className="text-3xl">📷</span>
                </div>
              )}
              <div>
                <input ref={fileInputRef} id="venue-image-upload" name="venue-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="glass-subtle hover:bg-white/[0.08] text-white/60 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : venue?.image ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="text-xs text-white/20 mt-1.5">JPG or PNG, max 5MB. Shown to guests on the voting page.</p>
              </div>
            </div>
          </div>

          {/* Player + QR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="lg:col-span-2 glass rounded-2xl overflow-hidden" style={{ minHeight: 280 }}>
              <div ref={playerRef} className="w-full h-full" style={{ minHeight: 280 }} />
            </div>
            <QRDisplay venueId={venueId} />
          </div>

          {/* Controls */}
          <div className="glass rounded-2xl p-5 mb-5">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Playback Controls</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSkip} className="inline-flex items-center gap-2 glass-subtle hover:bg-white/[0.08] text-white/60 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M15.25 5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75zm-10.324.614a.75.75 0 011.074.066L10.5 10l-4.5 4.32a.75.75 0 11-1.04-1.08L8.42 10 4.96 6.76a.75.75 0 01.066-1.074l-.1-.072z" />
                </svg>
                Skip
              </button>
              <button onClick={handlePause} className="inline-flex items-center gap-2 glass-subtle hover:bg-white/[0.08] text-white/60 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
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
              <button onClick={handleFilter} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${explicitFilter ? 'glass-button text-cyan-300' : 'glass-subtle hover:bg-white/[0.08] text-white/60'}`}>
                🛡️ Explicit: {explicitFilter ? 'ON' : 'OFF'}
              </button>
            </div>

            {totalReactions > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                <span className="text-xs text-white/40 font-semibold">Crowd vibes:</span>
                <div className="flex gap-3">
                  {reactions.fire > 0 && <span className="text-sm">🔥 <span className="text-xs text-white/60 font-bold">{reactions.fire}</span></span>}
                  {reactions.meh > 0 && <span className="text-sm">😐 <span className="text-xs text-white/60 font-bold">{reactions.meh}</span></span>}
                  {reactions.dislike > 0 && <span className="text-sm">👎 <span className="text-xs text-white/60 font-bold">{reactions.dislike}</span></span>}
                </div>
              </div>
            )}
          </div>

          {/* Live Queue */}
          <div className="glass rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Live Queue</h2>
                <div className="h-px w-8 bg-gradient-to-r from-cyan-500/30 to-transparent" />
              </div>
              {queue.length > 0 && (
                <span className="text-[11px] text-white/25 font-medium tabular-nums">{queue.length} {queue.length === 1 ? 'track' : 'tracks'}</span>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-white/40 text-sm font-medium">Queue's empty — waiting for requests</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {queue.map((entry, i) => {
                  const song = entry.songId || {};
                  const isTop = i === 0;
                  return (
                    <div
                      key={entry._id}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-[1.005] ${isTop ? 'glass rank-gold' : 'glass-subtle hover:bg-white/[0.06]'}`}
                    >
                      <div className="w-6 text-center flex-shrink-0">
                        {isTop ? <span className="text-base">👑</span> : <span className="text-white/20 text-xs font-bold tabular-nums">{i + 1}</span>}
                      </div>
                      <img src={song.thumbnail} alt={song.title} className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 ${isTop ? 'ring-2 ring-amber-400/25' : 'ring-1 ring-white/10'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                        <p className="text-xs text-white/35 truncate mt-0.5">{song.artist}</p>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${isTop ? 'text-amber-400' : 'text-cyan-400'}`}>{entry.voteCount}</span>
                      <button
                        onClick={() => handleDeleteQueueSong(song._id)}
                        className="text-white/15 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                        title="Remove from queue"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Search */}
          <div className="glass rounded-2xl p-5 mb-5">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Play a Song</h2>
            <form onSubmit={handleAdminSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                <input
                  id="admin-song-search"
                  name="admin-song-search"
                  type="text"
                  value={adminQuery}
                  onChange={(e) => setAdminQuery(e.target.value)}
                  placeholder="What are we playing?"
                  autoComplete="off"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25"
                />
              </div>
              <button type="submit" disabled={adminSearching} className="glass-button text-cyan-300 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50">
                {adminSearching ? '...' : 'Search'}
              </button>
            </form>
            {adminResults.length > 0 && (
              <div className="mt-2 glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
                {adminResults.map((song) => (
                  <div key={song.youtubeId} className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors">
                    <img src={song.thumbnail} alt={song.title} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">{song.title}</p>
                        {song.isExplicit && <span className="flex-shrink-0 text-[9px] font-bold bg-white/10 text-white/40 rounded px-1 py-0.5">E</span>}
                      </div>
                      <p className="text-xs text-white/35 truncate mt-0.5">{song.artist}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handlePlayNow(song)}
                        disabled={adminAdding === song.youtubeId}
                        className="text-xs glass-button text-cyan-300 rounded-lg px-3.5 py-2 font-bold disabled:opacity-50"
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={() => handleAddToQueue(song)}
                        disabled={adminAdding === song.youtubeId}
                        className="text-xs glass-subtle hover:bg-white/[0.08] text-white/50 rounded-lg px-3.5 py-2 font-semibold disabled:opacity-50"
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="glass rounded-2xl p-5" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
            <h2 className="text-xs font-bold text-red-400/70 uppercase tracking-widest mb-3">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/70">Delete this venue</p>
                <p className="text-xs text-white/25 mt-0.5">Permanently deletes the venue, your account, all songs, and the queue.</p>
              </div>
              <button
                onClick={handleDeleteVenue}
                className="bg-red-600/10 hover:bg-red-600 border border-red-600/30 text-red-400 hover:text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
              >
                Delete venue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
