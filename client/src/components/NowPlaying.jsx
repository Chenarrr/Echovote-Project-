import React, { useState } from 'react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const REACTIONS = [
  { emoji: '🔥', key: 'fire', label: 'Fire' },
  { emoji: '😐', key: 'meh', label: 'Meh' },
  { emoji: '👎', key: 'dislike', label: 'Skip' },
];

const NowPlaying = ({ song, progress = {}, onReaction }) => {
  const [reacted, setReacted] = useState(null);

  if (!song) return null;

  const { currentTime = 0, duration = 0 } = progress;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleReaction = (key) => {
    if (!onReaction || reacted === key) return;
    setReacted(key);
    onReaction(key);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient progress bar */}
      {duration > 0 && (
        <div className="h-[3px] bg-white/5 w-full">
          <div
            className="h-full np-progress transition-all duration-1000 ease-linear rounded-r-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="glass-heavy px-4 py-3 flex items-center gap-3">
        {/* Album art with glow */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-xl blur-lg opacity-40" style={{
            backgroundImage: `url(${song.thumbnail})`,
            backgroundSize: 'cover',
          }} />
          <img src={song.thumbnail} alt={song.title} className="relative w-11 h-11 rounded-xl object-cover ring-1 ring-white/15" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-end gap-[3px] h-3 flex-shrink-0">
              <span className="w-[2.5px] bg-cyan-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '0ms' }} />
              <span className="w-[2.5px] bg-cyan-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '200ms' }} />
              <span className="w-[2.5px] bg-purple-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '400ms' }} />
            </div>
            <p className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest">Playing</p>
          </div>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{song.title}</p>
        </div>

        {duration > 0 && (
          <span className="text-[11px] text-white/25 tabular-nums flex-shrink-0 font-medium">
            {formatTime(currentTime)}<span className="text-white/15"> / </span>{formatTime(duration)}
          </span>
        )}

        {onReaction && (
          <div className="flex gap-0.5 flex-shrink-0">
            {REACTIONS.map(({ emoji, key }) => (
              <button
                key={key}
                onClick={() => handleReaction(key)}
                className={`text-lg w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  reacted === key
                    ? 'glass scale-110 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'opacity-50 hover:opacity-100 hover:bg-white/[0.06]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {!onReaction && (
          <div className="flex items-end gap-[3px] h-4 flex-shrink-0">
            <span className="w-[3px] bg-cyan-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '0ms' }} />
            <span className="w-[3px] bg-cyan-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '200ms' }} />
            <span className="w-[3px] bg-purple-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '400ms' }} />
            <span className="w-[3px] bg-cyan-400 rounded-full" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', animationDelay: '150ms' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NowPlaying;
