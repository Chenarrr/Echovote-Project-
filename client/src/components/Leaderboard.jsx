import React from 'react';
import SongCard from './SongCard';

const Leaderboard = ({ queue, votedSongs, onVote, onUnvote, fingerprint, onDelete }) => {
  if (!queue.length) {
    return (
      <div className="text-center py-20 float-in glass rounded-[28px] panel-shell">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-white/70 text-base font-semibold">The stage is empty</p>
        <p className="text-white/45 text-sm mt-1.5">Search for a song above and get the party started</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest">Up Next</h2>
          <div className="h-px w-8 bg-gradient-to-r from-cyan-500/30 to-transparent" />
        </div>
        <span className="stat-pill !px-3 !py-1.5 text-[11px] tabular-nums">
          {queue.length} {queue.length === 1 ? 'track' : 'tracks'} queued
        </span>
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
