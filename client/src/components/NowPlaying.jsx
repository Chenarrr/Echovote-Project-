import React from 'react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const NowPlaying = ({ song, progress = {} }) => {
  if (!song) return null;

  const { currentTime = 0, duration = 0 } = progress;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 bg-surface-800 w-full">
          <div className="h-full bg-accent transition-all duration-1000 ease-linear" style={{ width: `${percent}%` }} />
        </div>
      )}
      <div className="bg-surface-900/95 backdrop-blur-md border-t border-surface-700/50 px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-10 h-10 rounded object-cover"
          />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-surface-400 font-medium">Now playing</p>
          <p className="text-sm font-medium text-surface-100 truncate">{song.title}</p>
        </div>
        {duration > 0 && (
          <span className="text-xs text-surface-500 tabular-nums flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
        <div className="flex items-end gap-[3px] h-4">
          <span className="w-[3px] bg-accent rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '0ms' }} />
          <span className="w-[3px] bg-accent rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '200ms' }} />
          <span className="w-[3px] bg-accent rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '400ms' }} />
          <span className="w-[3px] bg-accent rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '150ms' }} />
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
