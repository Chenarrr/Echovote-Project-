import React from 'react';
import SongCard from './SongCard';

const Leaderboard = ({ queue, votedSongs, onVote, onUnvote, fingerprint, onDelete }) => {
  if (!queue.length) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-surface-500">
            <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
          </svg>
        </div>
        <p className="text-surface-300 text-sm font-medium">No songs in the queue yet</p>
        <p className="text-surface-500 text-xs mt-1">Search above to add the first track</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Queue</h2>
        <span className="text-xs text-surface-500">{queue.length} {queue.length === 1 ? 'song' : 'songs'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {queue.map((entry, i) => {
          const song = entry.songId || entry;
          const canDelete = fingerprint && song.addedBy === fingerprint;
          return (
            <SongCard
              key={entry._id}
              entry={entry}
              rank={i + 1}
              voted={votedSongs.has(entry._id)}
              onVote={onVote}
              onUnvote={onUnvote}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
