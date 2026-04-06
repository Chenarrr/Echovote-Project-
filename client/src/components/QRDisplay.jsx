import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact }) => {
  if (!venueId) return null;

  return (
    <div className={`flex flex-col items-center gap-3 glass rounded-2xl ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Scan to vote</p>
      <div className="bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={compact ? 'w-32 h-32' : 'w-44 h-44'}
        />
      </div>
      <p className="text-[11px] text-white/25 text-center max-w-[200px]">
        Share this code so your crowd can request and vote for songs
      </p>
    </div>
  );
};

export default QRDisplay;
