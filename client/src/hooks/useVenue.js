import { useState, useEffect, useCallback } from 'react';
import { getQueue } from '../services/api';
import useSocket from './useSocket';

const useVenue = (venueId) => {
  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await getQueue(venueId);
      setQueue(data);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (venueId) fetchQueue();
  }, [fetchQueue, venueId]);

  useSocket(venueId, {
    queue_updated: ({ queue: q }) => setQueue(q),
    now_playing: ({ song }) => setNowPlaying(song),
    update_tally: ({ songId, newCount }) => {
      setQueue((prev) =>
        prev.map((entry) =>
          entry.songId?._id === songId || entry._id === songId
            ? { ...entry, voteCount: newCount }
            : entry
        )
      );
    },
  });

  return { queue, nowPlaying, loading, refetch: fetchQueue };
};

export default useVenue;
