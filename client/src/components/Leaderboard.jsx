import React from 'react';
import SongCard from './SongCard';

const Leaderboard = ({ queue, votedSongs, onVote }) => {
  if (!queue.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-3xl mb-2">🎵</p>
        <p className="text-sm">No, songs in the queue yet.</p>
        <p className="text-sm">Search above to add one!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {queue.map((entry, i) => (
        <SongCard
          key={entry._id}
          entry={entry}
          rank={i + 1}
          voted={votedSongs.has(entry._id)}
          onVote={onVote}
        />
      ))}
    </div>
  );
};

export default Leaderboard;
