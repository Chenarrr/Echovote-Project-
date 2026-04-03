import React from 'react';
import VoteButton from './VoteButton';

const SongCard = ({ entry, rank, voted, onVote }) => {
  const song = entry.songId || entry;
  const voteCount = entry.voteCount ?? 0;

  return (
    <div className="flex items-center gap-3 bg-surface-800/60 border border-surface-700/50 rounded-lg p-3 hover:bg-surface-800 transition-colors">
      <span className="text-surface-500 text-xs font-semibold w-5 text-center flex-shrink-0 tabular-nums">{rank}</span>
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-11 h-11 rounded object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-surface-100 truncate" dangerouslySetInnerHTML={{ __html: song.title }} />
        <p className="text-xs text-surface-400 truncate mt-0.5">{song.artist}</p>
      </div>
      <VoteButton count={voteCount} voted={voted} onClick={() => onVote(entry._id, song._id)} />
    </div>
  );
};

export default SongCard;
