import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact }) => {
  if (!venueId) return null;

  return (
    <div className={`flex flex-col items-center glass panel-shell rounded-[24px] ${compact ? 'gap-3 p-4' : 'gap-4 p-5'}`}>
      <h2 className="text-sm font-semibold text-white/80 text-center">
        {compact ? 'Scan' : 'Scan to vote'}
      </h2>
      <div className="bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={compact ? 'w-32 h-32' : 'w-40 h-40'}
        />
      </div>
    </div>
  );
};

export default QRDisplay;
