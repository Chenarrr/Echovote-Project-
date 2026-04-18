import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact, venueName, venueImage }) => {
  if (!venueId) return null;

  const sizeClass = compact ? 'w-44 h-44' : 'w-40 h-40';

  return (
    <div className={`flex flex-col items-center justify-between glass panel-shell rounded-[24px] ${compact ? 'gap-4 p-5' : 'gap-4 p-5'}`}>
      <div className="text-center">
        <h2 className="text-sm font-semibold text-white/85">Scan to vote</h2>
        {venueName && (
          <p className="text-xs text-white/50 mt-1 truncate max-w-[180px]">{venueName}</p>
        )}
      </div>

      {venueImage && (
        <img
          src={venueImage}
          alt={venueName || 'Venue'}
          className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/20"
        />
      )}

      <div className="bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={sizeClass}
        />
      </div>
      <p className="text-[11px] text-white/50 text-center">Open camera to scan</p>
    </div>
  );
};

export default QRDisplay;
