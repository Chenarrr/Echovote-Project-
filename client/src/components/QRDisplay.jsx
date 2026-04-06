import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact }) => {
  if (!venueId) return null;

  return (
    <div className={`flex flex-col items-center gap-3 glass rounded-glass-lg ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Scan to vote</p>
      <div className="bg-white/95 rounded-xl p-3 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={compact ? 'w-32 h-32' : 'w-44 h-44'}
        />
      </div>
      <p className="text-xs text-white/30 text-center max-w-[200px]">
        Share this code so guests can add and vote for songs
      </p>
    </div>
  );
};

export default QRDisplay;
