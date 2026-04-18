import React, { useEffect } from 'react';

const TOAST_TONES = {
  error: {
    label: 'Something went wrong',
    border: 'border-red-400/25',
    dot: 'bg-red-400',
  },
  success: {
    label: 'Done',
    border: 'border-emerald-400/25',
    dot: 'bg-emerald-400',
  },
  info: {
    label: 'Heads up',
    border: 'border-cyan-400/25',
    dot: 'bg-cyan-400',
  },
};

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [toast?.id, onDismiss]);

  if (!toast) return null;

  const tone = TOAST_TONES[toast.variant] || TOAST_TONES.info;

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-4 z-[60] sm:left-auto sm:max-w-sm">
      <div className={`pointer-events-auto glass-heavy panel-shell float-in rounded-2xl border p-3.5 shadow-2xl ${tone.border}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
              {tone.label}
            </p>
            <p className="mt-1 text-sm font-medium text-white/85">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="text-white/35 transition-colors hover:text-white/70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 01-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
