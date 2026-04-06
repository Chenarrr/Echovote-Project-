import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { castVote, undoVote, getVenueInfo, deleteSong } from '../services/api';
import useVenue from '../hooks/useVenue';
import { getSocket } from '../services/socket';
import SearchBar from '../components/SearchBar';
import Leaderboard from '../components/Leaderboard';
import NowPlaying from '../components/NowPlaying';

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
      alert(err.response?.data?.error || 'Could not cast vote');
    }
  }, [fingerprint, votedSongs]);

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
      alert(err.response?.data?.error || 'Could not undo vote');
    }
  }, [fingerprint, votedSongs]);

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
      alert(err.response?.data?.error || 'Could not remove song');
    }
  }, [fingerprint, venueId]);

  return (
    <div className="min-h-screen relative pb-24">
      <div className="ambient-bg">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-4 pt-5 pb-4">
          <div className="max-w-lg mx-auto glass-heavy rounded-2xl px-4 py-3 flex items-center justify-between float-in">
            <div className="flex items-center gap-3">
              {venue?.image ? (
                <img
                  src={`${API_URL}${venue.image}`}
                  alt={venue.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(168,85,247,0.2))' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyan-400">
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-gradient tracking-tight">
                  {venue?.name || 'EchoVote'}
                </h1>
                <p className="text-white/35 text-[11px] mt-0.5">Request songs, vote for vibes</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full pulse-ring" />
              <span className="text-[10px] text-emerald-400/90 font-semibold">LIVE</span>
            </div>
          </div>
        </header>

        <div className="px-4 pt-1 max-w-lg mx-auto">
          <SearchBar venueId={venueId} onSongAdded={refetch} fingerprint={fingerprint} />

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
      </div>
    </div>
  );
};

export default VenuePage;
