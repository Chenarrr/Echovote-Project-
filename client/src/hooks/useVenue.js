import { useState, useEffect, useCallback } from 'react';
import { getQueue, getVenueInfo } from '../services/api';
import useSocket from './useSocket';

const useVenue = (venueId) => {
  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState({ currentTime: 0, duration: 0 });
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
    if (!venueId) return;
    fetchQueue();
    getVenueInfo(venueId)
      .then(({ data }) => {
        if (data?.nowPlaying) setNowPlaying(data.nowPlaying);
      })
      .catch(() => {});
  }, [fetchQueue, venueId]);

  useSocket(venueId, {
    queue_updated: ({ queue: q }) => setQueue(q),
    now_playing: ({ song }) => { setNowPlaying(song); setPlaybackProgress({ currentTime: 0, duration: 0 }); },
    playback_progress: ({ currentTime, duration }) => setPlaybackProgress({ currentTime, duration }),
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

  return { queue, nowPlaying, playbackProgress, loading, refetch: fetchQueue };
};

export default useVenue;
