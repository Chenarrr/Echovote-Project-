import React, { useState } from 'react';

const VoteButton = ({ count, voted, onClick, onUnvote, disabled, isTop }) => {
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    if (voted) {
      onUnvote();
    } else {
      setPopping(true);
      setTimeout(() => setPopping(false), 300);
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all ${popping ? 'vote-pop' : ''}
        ${voted
          ? 'text-cyan-300 hover:bg-red-500/15 hover:text-red-400 active:scale-95'
          : 'text-white/40 hover:text-cyan-300 active:scale-95'
        }
        ${voted
          ? 'bg-cyan-400/15 border border-cyan-400/25 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
          : 'glass-subtle hover:border-cyan-500/20'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className={`w-3.5 h-3.5 transition-transform ${voted ? 'rotate-180' : ''}`}
      >
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
      <span className={`tabular-nums ${isTop && count > 0 ? 'text-amber-400' : ''}`}>{count}</span>
    </button>
  );
};

export default VoteButton;
