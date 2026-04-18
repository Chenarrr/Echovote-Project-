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
      {duration > 0 && (
        <div className="h-[3px] bg-white/5 w-full">
          <div
            className="h-full np-progress transition-all duration-1000 ease-linear rounded-r-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="mx-auto max-w-4xl px-3 pb-3">
        <div className="glass-heavy rounded-[26px] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src={song.thumbnail} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-1 ring-white/15 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-semibold">Now playing</p>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{song.title}</p>
              {song.artist && (
                <p className="text-[11px] text-white/50 truncate">{song.artist}</p>
              )}
            </div>

            {duration > 0 && (
              <span className="hidden sm:block text-[11px] text-white/40 tabular-nums flex-shrink-0 font-medium">
                {formatTime(currentTime)}<span className="text-white/15"> / </span>{formatTime(duration)}
              </span>
            )}

            {onReaction && (
              <div className="hidden sm:flex gap-1 flex-shrink-0">
                {REACTIONS.map(({ emoji, key }) => (
                  <button
                    key={key}
                    onClick={() => handleReaction(key)}
                    className={`text-base w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                      reacted === key
                        ? 'glass scale-110 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'glass-subtle opacity-70 hover:opacity-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onReaction && (
            <div className="flex sm:hidden gap-2 mt-2.5 justify-between items-center">
              {duration > 0 && (
                <span className="text-[11px] text-white/40 tabular-nums font-medium">
                  {formatTime(currentTime)}<span className="text-white/15"> / </span>{formatTime(duration)}
                </span>
              )}
              <div className="flex gap-1.5 ml-auto">
                {REACTIONS.map(({ emoji, key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleReaction(key)}
                    className={`flex items-center gap-1 rounded-2xl px-3 py-1.5 text-sm font-semibold transition-all ${
                      reacted === key
                        ? 'glass text-white scale-105 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'glass-subtle text-white/60 hover:text-white'
                    }`}
                  >
                    {emoji} <span className="text-[11px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
