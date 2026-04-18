import React, { useState } from 'react';
import { superAdminGetStats } from '../services/api';

const SuperAdmin = () => {
  const [key, setKey] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const unlock = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await superAdminGetStats(key);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Access denied');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await superAdminGetStats(key);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Session expired');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const lock = () => {
    setKey('');
    setStats(null);
    setError('');
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={unlock} className="glass-heavy panel-shell rounded-[32px] p-8 w-full max-w-md space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">Restricted</p>
            <h1 className="text-2xl font-semibold text-white mt-1">Super Admin</h1>
            <p className="text-sm text-white/50 mt-2">Enter the access key to view platform stats.</p>
          </div>
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Access key"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-300/40"
            required
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full bg-cyan-400/90 hover:bg-cyan-300 text-black font-semibold rounded-2xl py-3 transition disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  const { totals, venues, generatedAt } = stats;

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">Super Admin</p>
          <h1 className="text-2xl font-semibold text-white">Platform Overview</h1>
          <p className="text-xs text-white/40 mt-1">Updated {new Date(generatedAt).toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading} className="stat-pill !px-4 !py-2 text-sm">
            {loading ? '…' : 'Refresh'}
          </button>
          <button onClick={lock} className="stat-pill !px-4 !py-2 text-sm">Lock</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Admins" value={totals.admins} />
        <StatCard label="Venues" value={totals.venues} />
        <StatCard label="Users" value={totals.uniqueUsers} />
        <StatCard label="Songs" value={totals.totalSongs} />
      </div>

      <div className="glass-heavy panel-shell rounded-[28px] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">Venues</p>
        </div>
        <div className="divide-y divide-white/5">
          {venues.length === 0 && (
            <p className="p-5 text-sm text-white/50">No venues yet.</p>
          )}
          {venues.map((v) => (
            <div key={v.venueId} className="p-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{v.name}</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {new Date(v.createdAt).toLocaleDateString()} · {v.admins} admin{v.admins === 1 ? '' : 's'}
                  {v.twoFactorEnabled > 0 && ` · ${v.twoFactorEnabled} 2FA`}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="stat-pill !px-3 !py-1.5">{v.uniqueUsers} users</span>
                <span className="stat-pill !px-3 !py-1.5">{v.songsInQueue} queued</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="glass-heavy panel-shell rounded-[24px] p-5">
    <p className="text-[10px] uppercase tracking-[0.24em] text-white/42 font-semibold">{label}</p>
    <p className="text-3xl font-semibold text-white mt-2">{value}</p>
  </div>
);

export default SuperAdmin;
