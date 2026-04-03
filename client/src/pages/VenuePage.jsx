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
    <div className="min-h-screen bg-brand-dark pb-24">
      <header className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
          EchoVote
        </h1>
        <p className="text-gray-400 text-sm mt-1">Vote for the next song</p>
      </header>

      <div className="px-4">
        <SearchBar venueId={venueId} onSongAdded={refetch} />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
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
