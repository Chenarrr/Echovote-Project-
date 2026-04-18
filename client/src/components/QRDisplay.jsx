import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact, venueName, venueImage }) => {
  if (!venueId) return null;

  const sizeClass = compact ? 'w-48 h-48' : 'w-40 h-40';

  return (
    <div className={`flex flex-col items-center justify-between glass-heavy panel-shell rounded-[28px] ${compact ? 'gap-5 p-6' : 'gap-4 p-5'}`}>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">Access</p>
        <h2 className="display-type text-[1.4rem] font-semibold text-white mt-2">Scan to vote</h2>
        {venueName && (
          <p className="text-xs text-white/52 mt-1 truncate max-w-[210px]">{venueName}</p>
        )}
      </div>

      <div className="glass-subtle rounded-[22px] px-4 py-3">
        {venueImage ? (
          <img
            src={venueImage}
            alt={venueName || 'Venue'}
            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/20"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.05]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-200">
              <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
            </svg>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[28px] p-4 shadow-[0_0_34px_rgba(34,211,238,0.14)] ring-1 ring-cyan-100/40">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={sizeClass}
        />
      </div>
      <div className="stat-pill !px-4 !py-2 text-[11px]">
        Open camera
      </div>
    </div>
  );
};

export default QRDisplay;
