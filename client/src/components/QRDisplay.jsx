import React from 'react';
import { getQrCode } from '../services/api';

const QRDisplay = ({ venueId }) => {
  if (!venueId) return null;

  return (
    <div className="flex flex-col items-center gap-3 p-6 bg-brand-card border border-brand-border rounded-xl">
      <p className="text-sm text-gray-400 font-medium">Scan to vote</p>
      <img
        src={getQrCode(venueId)}
        alt="QR Code"
        className="w-48 h-48 rounded-xl bg-white p-2"
      />
      <p className="text-xs text-gray-500 text-center">Share this QR code so guests can add &amp; vote for songs</p>
    </div>
  );
};

export default QRDisplay;
