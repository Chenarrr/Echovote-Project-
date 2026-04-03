import React from 'react';

const VoteButton = ({ count, voted, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || voted}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all
        ${voted
          ? 'bg-accent-muted text-accent cursor-default'
          : 'bg-surface-800 text-surface-300 hover:bg-accent-muted hover:text-accent active:scale-[0.97]'
        }
        ${disabled && !voted ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
      {count}
    </button>
  );
};

export default VoteButton;
