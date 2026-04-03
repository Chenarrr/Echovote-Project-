import React from 'react';
import VoteButton from './VoteButton';

const SongCard = ({ entry, rank, voted, onVote }) => {
  const song = entry.songId || entry;
  const voteCount = entry.voteCount ?? 0;

  return (
    <div className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-xl p-3">
      <span className="text-gray-500 text-sm font-bold w-5 text-center flex-shrink-0">{rank}</span>
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" dangerouslySetInnerHTML={{ __html: song.title }} />
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>
      <VoteButton count={voteCount} voted={voted} onClick={() => onVote(entry._id, song._id)} />
    </div>
  );
};

export default SongCard;
