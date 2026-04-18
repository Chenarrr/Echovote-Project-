import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId, compact }) => {
  if (!venueId) return null;

  return (
    <div className={`flex flex-col items-center gap-3 glass panel-shell rounded-[28px] ${compact ? 'p-4' : 'p-6'}`}>
      <p className="section-kicker">Share Access</p>
      <h2 className="section-heading text-center">{compact ? 'Vote here' : 'Scan to vote'}</h2>
      <div className="bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
        <img
          src={getQrCode(venueId)}
          alt="QR Code"
          className={compact ? 'w-32 h-32' : 'w-44 h-44'}
        />
      </div>
      <p className="text-[11px] text-white/45 text-center max-w-[220px]">
        Share this code so your crowd can request and vote for songs
      </p>
    </div>
  );
};

export default QRDisplay;
