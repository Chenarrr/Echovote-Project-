import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSkip, adminPause, adminFilter, getAdminVenue, uploadVenueImage, deleteVenue, searchSongs, addSong, playNow, adminDeleteSong } from '../services/api';
import useVenue from '../hooks/useVenue';
import QRDisplay from '../components/QRDisplay';
import Toast from '../components/Toast';
import useSocket from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const venueId = localStorage.getItem('echovote_venueId');
  const adminToken = localStorage.getItem('echovote_token');
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
  const [toast, setToast] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadedSongRef = useRef(null);

  const showToast = useCallback((message, variant = 'error') => {
    setToast({ id: `${Date.now()}-${Math.random()}`, message, variant });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const getErrorMessage = useCallback((err, fallback) => {
    return err.response?.data?.error || err.message || fallback;
  }, []);

  const socket = useSocket(venueId, {
    playback_state: ({ isPlaying: p }) => {
      setIsPlaying(p);
      if (playerInstanceRef.current) {
        p ? playerInstanceRef.current.playVideo() : playerInstanceRef.current.pauseVideo();
      }
    },
    now_playing: ({ song }) => {
      if (!song) {
        loadedSongRef.current = null;
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
      setIsPlaying(Boolean(data.playbackState?.isPlaying));
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
          onReady: () => {
            setPlayerReady(true);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              adminSkip().catch(console.error);
            }
          },
        },
      });
    };
  }, []);

  const activeSong = nowPlaying || venue?.playbackState?.currentSong || null;

  useEffect(() => {
    if (!playerReady || !playerInstanceRef.current) return;
    if (!activeSong?.youtubeId) {
      loadedSongRef.current = null;
      return;
    }

    if (loadedSongRef.current === activeSong.youtubeId) return;

    loadedSongRef.current = activeSong.youtubeId;
    if (isPlaying) {
      playerInstanceRef.current.loadVideoById(activeSong.youtubeId);
    } else {
      playerInstanceRef.current.cueVideoById(activeSong.youtubeId);
    }
  }, [activeSong, isPlaying, playerReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerInstanceRef.current && socket && adminToken) {
        const currentTime = playerInstanceRef.current.getCurrentTime?.();
        const duration = playerInstanceRef.current.getDuration?.();
        if (currentTime != null && duration) {
          socket.emit('progress_update', { venueId, currentTime, duration, token: adminToken });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [adminToken, venueId, socket]);

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
      showToast(getErrorMessage(err, 'Upload failed'));
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
      showToast(getErrorMessage(err, 'Failed to delete venue'));
    }
  };

  const handleSkip = async () => {
    try { await adminSkip(); } catch (err) { showToast(getErrorMessage(err, 'Could not skip track')); }
  };

  const handlePause = async () => {
    try {
      const { data } = await adminPause();
      setIsPlaying(data.isPlaying);
      if (playerInstanceRef.current) {
        data.isPlaying ? playerInstanceRef.current.playVideo() : playerInstanceRef.current.pauseVideo();
      }
    } catch (err) { showToast(getErrorMessage(err, 'Could not update playback')); }
  };

  const handleFilter = async () => {
    try {
      const { data } = await adminFilter();
      setExplicitFilter(data.explicitFilter);
    } catch (err) { showToast(getErrorMessage(err, 'Could not update filter')); }
  };

  const handleAdminSearch = async (e) => {
    e.preventDefault();
    if (!adminQuery.trim()) {
      setAdminResults([]);
      return;
    }
    setAdminSearching(true);
    try {
      const { data } = await searchSongs(adminQuery);
      setAdminResults(data);
    } catch (err) {
      setAdminResults([]);
      showToast(getErrorMessage(err, 'Could not search songs'));
    }
    finally { setAdminSearching(false); }
  };

  const clearAdminSearch = () => {
    setAdminQuery('');
    setAdminResults([]);
  };

  useEffect(() => {
    if (!adminQuery.trim()) setAdminResults([]);
  }, [adminQuery]);

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
    } catch (err) { showToast(getErrorMessage(err, 'Failed to play')); }
    finally { setAdminAdding(null); }
  };

  const handleAddToQueue = async (song) => {
    setAdminAdding(song.youtubeId);
    try {
      await addSong(venueId, song);
      setAdminResults((prev) => prev.filter((s) => s.youtubeId !== song.youtubeId));
    } catch (err) { showToast(getErrorMessage(err, 'Could not add song')); }
    finally { setAdminAdding(null); }
  };

  const handleDeleteQueueSong = async (songId) => {
    try {
      await adminDeleteSong(songId);
    } catch (err) { showToast(getErrorMessage(err, 'Failed to remove song')); }
  };

  const venueImageUrl = venue?.image ? `${API_URL}${venue.image}` : null;
  const visibleAdminResults = adminResults.slice(0, 6);
  const roomStateLabel = isPlaying ? 'Room live' : 'Room paused';

  return (
    <div className="min-h-screen relative">
      <div className="ambient-bg">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      <div className="relative z-10">
        <header className="px-4 lg:px-8 pt-4">
          <div className="max-w-[1400px] mx-auto glass-heavy panel-shell rounded-[30px] px-5 py-4 float-in">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                {venueImageUrl ? (
                  <img src={venueImageUrl} alt={venue?.name} className="w-14 h-14 rounded-[22px] object-cover ring-1 ring-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.22)]" />
                ) : (
                  <div className="w-14 h-14 rounded-[22px] flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.22)]" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.26), rgba(45,212,191,0.18))' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-200">
                      <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Admin console</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h1 className="display-type text-[1.65rem] lg:text-[1.9rem] font-semibold text-gradient tracking-tight truncate">
                      {venue?.name || 'EchoVote'}
                    </h1>
                    <span className="stat-pill !px-3.5 !py-2 text-[11px]">
                      <span className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-400 pulse-ring' : 'bg-white/25'}`} />
                      {roomStateLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start lg:self-auto">
                <input ref={fileInputRef} id="venue-image-upload" name="venue-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button
                  onClick={handleLogout}
                  className="glass-subtle hover:bg-white/[0.08] text-white/75 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_340px] gap-4 items-stretch">
            <div className="glass-heavy panel-shell rounded-[30px] p-4 lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Screen</p>
                  <h2 className="display-type text-[1.28rem] font-semibold text-white mt-1">Now playing</h2>
                </div>
                <div className="flex items-center gap-2">
                  {[['🔥', 'fire'], ['😐', 'meh'], ['👎', 'dislike']].map(([emoji, key]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${reactions[key] > 0 ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-white/30'}`}
                    >
                      {emoji} <span className="tabular-nums">{reactions[key]}</span>
                    </span>
                  ))}
                  {isPlaying ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white" style={{ background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.38)', boxShadow: '0 0 12px rgba(239,68,68,0.25)' }}>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="stat-pill !px-3.5 !py-2 text-[11px]">Idle</span>
                  )}
                </div>
              </div>
              <div ref={playerRef} className="w-full overflow-hidden rounded-[24px] glass-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ aspectRatio: '16 / 9' }} />

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {activeSong?.thumbnail ? (
                    <img
                      src={activeSong.thumbnail}
                      alt={activeSong.title}
                      className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl glass-subtle flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-200/90">
                        <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Current song</p>
                    <p className="text-sm lg:text-base font-semibold text-white truncate mt-1">
                      {activeSong?.title || 'Waiting for a track'}
                    </p>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {activeSong?.artist || 'Queue a song to start the room'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="stat-pill !px-3.5 !py-2 text-[11px]">{queue.length} queued</span>
                </div>
              </div>
            </div>
            <QRDisplay venueId={venueId} compact venueName={venue?.name} venueImage={venueImageUrl} />
          </div>

          <div className="glass-heavy panel-shell rounded-[30px] p-4 lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Playback</p>
                <h2 className="display-type text-[1.2rem] font-semibold text-white mt-1">Controls</h2>
              </div>
              <span className="stat-pill !px-3.5 !py-2 text-[11px]">{isPlaying ? 'Playing' : 'Paused'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={handleSkip} className="inline-flex min-w-[150px] items-center justify-center gap-2 glass-button text-cyan-100 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M15.25 5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75zm-10.324.614a.75.75 0 011.074.066L10.5 10l-4.5 4.32a.75.75 0 11-1.04-1.08L8.42 10 4.96 6.76a.75.75 0 01.066-1.074l-.1-.072z" />
                </svg>
                Skip
              </button>
              <button onClick={handlePause} className="inline-flex min-w-[150px] items-center justify-center gap-2 glass-subtle hover:bg-white/[0.08] text-white/75 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
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
              <button onClick={handleFilter} className={`inline-flex min-w-[170px] items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${explicitFilter ? 'glass-button text-cyan-100' : 'glass-subtle hover:bg-white/[0.08] text-white/75'}`}>
                🛡️ Explicit: {explicitFilter ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.96fr)] gap-4">
            <div className="glass-heavy panel-shell rounded-[30px] p-4 lg:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Room</p>
                  <h2 className="display-type text-[1.2rem] font-semibold text-white mt-1">Queue</h2>
                </div>
                {queue.length > 0 && (
                  <span className="stat-pill !px-3.5 !py-2 text-[11px] tabular-nums">{queue.length}</span>
                )}
              </div>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : queue.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🎵</div>
                  <p className="text-white/55 text-sm font-medium">Queue is clear</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[540px] overflow-y-auto pr-1">
                  {queue.map((entry, i) => {
                    const song = entry.songId || {};
                    const isTop = i === 0;
                    return (
                      <div
                        key={entry._id}
                        className={`flex items-center gap-3 rounded-[22px] p-3.5 transition-all hover:scale-[1.005] ${isTop ? 'glass rank-gold panel-shell' : 'glass-subtle hover:bg-white/[0.06]'}`}
                      >
                        <div className="w-6 text-center flex-shrink-0">
                          {isTop ? <span className="text-base">👑</span> : <span className="text-white/20 text-xs font-bold tabular-nums">{i + 1}</span>}
                        </div>
                        <img src={song.thumbnail} alt={song.title} className={`w-12 h-12 rounded-2xl object-cover flex-shrink-0 ${isTop ? 'ring-2 ring-amber-400/25' : 'ring-1 ring-white/10'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                          <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${isTop ? 'text-amber-400' : 'text-cyan-400'}`}>{entry.voteCount}</span>
                        <button
                          onClick={() => handleDeleteQueueSong(song._id)}
                          className="glass-subtle hover:bg-red-500/12 text-white/55 hover:text-red-300 transition-colors px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
                          title="Remove from queue"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-heavy panel-shell rounded-[30px] p-4 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Catalog</p>
                    <h2 className="display-type text-[1.2rem] font-semibold text-white mt-1">Add song</h2>
                  </div>
                  {adminResults.length > 0 && (
                    <span className="stat-pill !px-3.5 !py-2 text-[11px]">{visibleAdminResults.length}</span>
                  )}
                </div>
                <form onSubmit={handleAdminSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                    <input
                      id="admin-song-search"
                      name="admin-song-search"
                      type="search"
                      inputMode="search"
                      enterKeyHint="search"
                      value={adminQuery}
                      onChange={(e) => setAdminQuery(e.target.value)}
                      placeholder="Search artist or song"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full glass-input rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/35"
                    />
                    {adminQuery && (
                      <button
                        type="button"
                        onClick={clearAdminSearch}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button type="submit" disabled={adminSearching} className="glass-button text-cyan-100 rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-50 min-w-[96px]">
                    {adminSearching ? '...' : 'Search'}
                  </button>
                </form>
                {visibleAdminResults.length > 0 && (
                  <div className="mt-4 max-h-[360px] overflow-y-auto glass rounded-[24px] divide-y divide-white/[0.05]">
                    {visibleAdminResults.map((song) => (
                      <div key={song.youtubeId} className="flex items-center gap-3 p-3.5 hover:bg-white/[0.05] transition-colors">
                        <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 ring-1 ring-white/10" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-white truncate">{song.title}</p>
                            {song.isExplicit && <span className="flex-shrink-0 text-[9px] font-bold bg-white/10 text-white/55 rounded px-1 py-0.5">E</span>}
                          </div>
                          <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handlePlayNow(song)}
                            disabled={adminAdding === song.youtubeId}
                            className="text-xs glass-button text-cyan-100 rounded-xl px-3.5 py-2.5 font-bold disabled:opacity-50"
                          >
                            ▶ Play
                          </button>
                          <button
                            onClick={() => handleAddToQueue(song)}
                            disabled={adminAdding === song.youtubeId}
                            className="text-xs glass-subtle hover:bg-white/[0.08] text-white/75 rounded-xl px-3.5 py-2.5 font-semibold disabled:opacity-50"
                          >
                            + Queue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-heavy panel-shell rounded-[30px] p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Brand and reset</p>
                    <h3 className="display-type text-[1.15rem] font-semibold text-white mt-1">Venue settings</h3>
                  </div>
                  <span className="stat-pill !px-3.5 !py-2 text-[11px]">Permanent</span>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-[22px] glass-subtle p-3.5">
                  {venueImageUrl ? (
                    <img src={venueImageUrl} alt={venue?.name} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/15" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.05]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-200">
                        <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{venue?.name || 'EchoVote'}</p>
                    <p className="text-xs text-white/48 mt-0.5">Update logo or remove the room.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="glass-subtle hover:bg-white/[0.08] text-white/78 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Updating...' : 'Change logo'}
                  </button>
                  <button
                    onClick={handleDeleteVenue}
                    className="rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    Delete venue
                  </button>
                </div>

                <p className="text-xs text-white/38 mt-3">Deleting the venue removes the room, queue, and admin access.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};

export default AdminDashboard;
