import React from 'react';
import VoteButton from './VoteButton';

const SongCard = ({ entry, rank, voted, onVote, onUnvote, canDelete, onDelete }) => {
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
      <VoteButton count={voteCount} voted={voted} onClick={() => onVote(entry._id, song._id)} onUnvote={() => onUnvote(entry._id, song._id)} />
      {canDelete && (
        <button
          onClick={() => onDelete(song._id)}
          className="text-surface-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
          title="Remove your song"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SongCard;
