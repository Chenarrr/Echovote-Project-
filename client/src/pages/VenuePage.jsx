import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { castVote, undoVote, getVenueInfo, deleteSong } from '../services/api';
import useVenue from '../hooks/useVenue';
import { getSocket } from '../services/socket';
import SearchBar from '../components/SearchBar';
import Leaderboard from '../components/Leaderboard';
import NowPlaying from '../components/NowPlaying';
import Toast from '../components/Toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const VenuePage = () => {
  const { id: venueId } = useParams();
  const { queue, nowPlaying, playbackProgress, loading, refetch } = useVenue(venueId);
  const [fingerprint, setFingerprint] = useState(null);
  const [votedSongs, setVotedSongs] = useState(() => {
    try {
      const saved = localStorage.getItem(`echovote_votes_${venueId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [venue, setVenue] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, variant = 'error') => {
    setToast({ id: `${Date.now()}-${Math.random()}`, message, variant });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const getErrorMessage = useCallback((err, fallback) => {
    return err.response?.data?.error || err.message || fallback;
  }, []);

  useEffect(() => {
    localStorage.setItem(`echovote_votes_${venueId}`, JSON.stringify([...votedSongs]));
  }, [votedSongs, venueId]);

  useEffect(() => {
    FingerprintJS.load().then((fp) => fp.get()).then((result) => {
      setFingerprint(result.visitorId);
    });
  }, []);

  useEffect(() => {
    if (venueId) {
      getVenueInfo(venueId).then(({ data }) => setVenue(data)).catch(() => {});
    }
  }, [venueId]);

  const handleVote = useCallback(async (queueEntryId, songId) => {
    if (!fingerprint || votedSongs.has(queueEntryId)) return;
    try {
      await castVote(songId, fingerprint);
      setVotedSongs((prev) => new Set([...prev, queueEntryId]));
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not cast vote'));
    }
  }, [fingerprint, getErrorMessage, showToast, votedSongs]);

  const handleUnvote = useCallback(async (queueEntryId, songId) => {
    if (!fingerprint || !votedSongs.has(queueEntryId)) return;
    try {
      await undoVote(songId, fingerprint);
      setVotedSongs((prev) => {
        const next = new Set(prev);
        next.delete(queueEntryId);
        return next;
      });
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not undo vote'));
    }
  }, [fingerprint, getErrorMessage, showToast, votedSongs]);

  const handleReaction = useCallback((reaction) => {
    if (!fingerprint) return;
    const socket = getSocket();
    socket.emit('song_reaction', { venueId, reaction, fingerprint });
  }, [fingerprint, venueId]);

  const handleDelete = useCallback(async (songId) => {
    if (!fingerprint) return;
    try {
      await deleteSong(venueId, songId, fingerprint);
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not remove song'));
    }
  }, [fingerprint, getErrorMessage, showToast, venueId]);

  const venueImageUrl = venue?.image ? `${API_URL}${venue.image}` : null;

  return (
    <div className="min-h-screen relative pb-24">
      <div className="ambient-bg">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      <div className="relative z-10">
        <header className="px-4 pt-4 pb-3">
          <div className="max-w-xl mx-auto glass-heavy panel-shell rounded-[24px] px-4 py-3.5 flex items-center justify-between float-in">
            <div className="flex items-center gap-3">
              {venueImageUrl ? (
                <img
                  src={venueImageUrl}
                  alt={venue.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(45,212,191,0.18))' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyan-200">
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Live room</p>
                <h1 className="display-type text-[1.35rem] font-semibold text-gradient tracking-tight mt-0.5">
                  {venue?.name || 'EchoVote'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full pulse-ring" />
              <span className="text-[10px] text-emerald-400/90 font-semibold uppercase tracking-[0.2em]">Vote</span>
            </div>
          </div>
        </header>

        <div className="px-4 pt-1 max-w-xl mx-auto">
          <SearchBar venueId={venueId} onSongAdded={refetch} fingerprint={fingerprint} onError={showToast} />

          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-white/30 text-xs">Loading the queue...</p>
            </div>
          ) : (
            <Leaderboard queue={queue} votedSongs={votedSongs} onVote={handleVote} onUnvote={handleUnvote} fingerprint={fingerprint} onDelete={handleDelete} />
          )}
        </div>

        <NowPlaying song={nowPlaying} progress={playbackProgress} onReaction={handleReaction} />
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </div>
  );
};

export default VenuePage;
