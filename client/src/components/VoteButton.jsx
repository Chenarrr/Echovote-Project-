import React from 'react';

const VoteButton = ({ count, voted, onClick, onUnvote, disabled }) => {
  return (
    <button
      onClick={voted ? onUnvote : onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all
        ${voted
          ? 'bg-accent/20 border border-accent/30 text-accent shadow-glow hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 hover:shadow-none active:scale-[0.97]'
          : 'glass-subtle text-white/50 hover:bg-accent/15 hover:text-accent hover:border-accent/25 active:scale-[0.97]'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${voted ? 'rotate-180' : ''}`}>
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
      {count}
    </button>
  );
};

export default VoteButton;
