import React from 'react';
import SongCard from './SongCard';

const Leaderboard = ({ queue, votedSongs, onVote, onUnvote, fingerprint, onDelete }) => {
  if (!queue.length) {
    return (
      <div className="text-center py-20 float-in glass rounded-[28px] panel-shell">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-white/70 text-base font-semibold">No songs yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-white/80">Queue</h2>
        <span className="stat-pill !px-3 !py-1 text-[11px] tabular-nums">{queue.length}</span>
      </div>
      <div className="flex flex-col gap-2">
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
