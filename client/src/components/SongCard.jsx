import React from 'react';
import VoteButton from './VoteButton';

const SongCard = ({ entry, rank, voted, onVote, onUnvote, canDelete, onDelete }) => {
  const song = entry.songId || entry;
  const voteCount = entry.voteCount ?? 0;
  const isTop = rank === 1;

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 rounded-[24px] p-3 sm:p-4 transition-all hover:scale-[1.01] float-in ${
        isTop ? 'glass rank-gold panel-shell' : 'glass panel-shell hover:bg-white/[0.08]'
      }`}
      style={{ animationDelay: `${(rank - 1) * 60}ms`, opacity: 0 }}
    >
      <div className="flex-shrink-0 w-5 sm:w-7 text-center">
        {isTop ? (
          <span className="text-base sm:text-lg" title="Top voted">👑</span>
        ) : (
          <span className="text-white/35 text-xs font-bold tabular-nums">{rank}</span>
        )}
      </div>

      <div className="relative flex-shrink-0">
        <img
          src={song.thumbnail}
          alt={song.title}
          className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl object-cover ${isTop ? 'ring-2 ring-amber-400/40' : 'ring-1 ring-white/10'}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-[14px] sm:text-[15px] truncate ${isTop ? 'text-white' : 'text-white/92'}`}>{song.title}</p>
        <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
      </div>

      <VoteButton count={voteCount} voted={voted} onClick={() => onVote(entry._id, song._id)} onUnvote={() => onUnvote(entry._id, song._id)} isTop={isTop} />

      {canDelete && (
        <button
          onClick={() => onDelete(song._id)}
          className="glass-subtle text-white/35 hover:text-red-300 transition-colors p-1.5 sm:p-2 rounded-xl flex-shrink-0"
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
