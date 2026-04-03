import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { castVote } from '../services/api';
import useVenue from '../hooks/useVenue';
import SearchBar from '../components/SearchBar';
import Leaderboard from '../components/Leaderboard';
import NowPlaying from '../components/NowPlaying';

const VenuePage = () => {
  const { id: venueId } = useParams();
  const { queue, nowPlaying, loading, refetch } = useVenue(venueId);
  const [fingerprint, setFingerprint] = useState(null);
  const [votedSongs, setVotedSongs] = useState(new Set());

  useEffect(() => {
    FingerprintJS.load().then((fp) => fp.get()).then((result) => {
      setFingerprint(result.visitorId);
    });
  }, []);

  const handleVote = useCallback(async (queueEntryId, songId) => {
    if (!fingerprint || votedSongs.has(queueEntryId)) return;
    try {
      await castVote(songId, fingerprint);
      setVotedSongs((prev) => new Set([...prev, queueEntryId]));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cast vote');
    }
  }, [fingerprint, votedSongs]);

  return (
    <div className="min-h-screen bg-surface-900 pb-20">
      <header className="px-4 pt-6 pb-5 border-b border-surface-700/50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-100 tracking-tight">EchoVote</h1>
            <p className="text-surface-400 text-xs mt-0.5">Vote for the next song</p>
          </div>
          <div className="flex items-center gap-1.5 text-accent">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs text-surface-400 font-medium">Live</span>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 max-w-lg mx-auto">
        <SearchBar venueId={venueId} onSongAdded={refetch} />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <Leaderboard queue={queue} votedSongs={votedSongs} onVote={handleVote} />
        )}
      </div>

      <NowPlaying song={nowPlaying} />
    </div>
  );
};

export default VenuePage;
