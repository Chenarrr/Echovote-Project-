import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact }) => {
  if (!venueId) return null;

  return (
    <div className={`flex flex-col items-center gap-3 bg-surface-800/60 border border-surface-700/50 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Scan to vote</p>
      <div className="bg-white rounded-lg p-3">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={compact ? 'w-32 h-32' : 'w-44 h-44'}
        />
      </div>
      <p className="text-xs text-surface-500 text-center max-w-[200px]">
        Share this code so guests can add and vote for songs
      </p>
    </div>
  );
};

export default QRDisplay;
