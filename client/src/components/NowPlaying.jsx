import React from 'react';

const NowPlaying = ({ song }) => {
  if (!song) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-border px-4 py-3 flex items-center gap-3 z-50">
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-12 h-12 rounded object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{song.title}</p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-1.5 text-brand-purple">
        <span className="inline-block w-1.5 h-3 bg-brand-purple rounded-sm animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="inline-block w-1.5 h-5 bg-brand-purple rounded-sm animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="inline-block w-1.5 h-3 bg-brand-purple rounded-sm animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default NowPlaying;
