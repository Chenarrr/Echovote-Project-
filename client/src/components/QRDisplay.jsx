import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact, venueName, venueImage }) => {
  if (!venueId) return null;

  const imgSize = compact ? 'w-full aspect-square' : 'w-40 h-40';

  return (
    <div className={`flex w-full flex-col items-center glass-heavy panel-shell rounded-[30px] ${compact ? 'gap-3 p-5 lg:p-6' : 'gap-4 p-5'}`}>
      <div className="w-full flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">Scan to vote</p>
        {venueName && (
          <p className="text-[11px] text-white/50 truncate max-w-[140px]">{venueName}</p>
        )}
      </div>

      {venueImage ? (
        <img
          src={venueImage}
          alt={venueName || 'Venue'}
          className="w-full aspect-square rounded-[22px] object-cover ring-1 ring-white/15"
        />
      ) : (
        <div className="w-full aspect-square rounded-[22px] flex items-center justify-center bg-white/[0.05]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-200/40">
            <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
          </svg>
        </div>
      )}

      <img
        src={getQrCode(venueId)}
        alt="QR Code"
        className={`${imgSize} rounded-[22px]`}
        style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
      />

      <div className="stat-pill !px-4 !py-2 text-[11px] w-full text-center">Open camera</div>
    </div>
  );
};

export default QRDisplay;
