import React from 'react';

const VoteButton = ({ count, voted, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || voted}
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all font-bold text-sm
        ${voted
          ? 'border-brand-purple bg-brand-purple/20 text-brand-purple cursor-default'
          : 'border-brand-border bg-brand-card text-white hover:border-brand-purple hover:bg-brand-purple/10 active:scale-95'
        }
        ${disabled && !voted ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mb-0.5">
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
      {count}
    </button>
  );
};

export default VoteButton;
