import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, adminRegister, verify2FASetup } from '../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('credentials');
  const [form, setForm] = useState({ email: '', password: '', venueName: '', totpCode: '' });
  const [setup2FA, setSetup2FA] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register' && step === 'credentials') {
        const { data } = await adminRegister(form.email, form.password, form.venueName);
        if (data.setupRequired) {
          setSetup2FA(data);
          setStep('setup-2fa');
        }
      } else if (mode === 'register' && step === 'setup-2fa') {
        const { data } = await verify2FASetup(form.email, form.totpCode);
        localStorage.setItem('echovote_token', data.token);
        localStorage.setItem('echovote_venueId', data.venueId);
        navigate('/admin/dashboard');
      } else if (mode === 'login' && step === 'credentials') {
        const { data } = await adminLogin(form.email, form.password);
        if (data.requires2FA) {
          setStep('verify-2fa');
        } else {
          localStorage.setItem('echovote_token', data.token);
          localStorage.setItem('echovote_venueId', data.venueId);
          navigate('/admin/dashboard');
        }
      } else if (mode === 'login' && step === 'verify-2fa') {
        const { data } = await adminLogin(form.email, form.password, form.totpCode);
        localStorage.setItem('echovote_token', data.token);
        localStorage.setItem('echovote_venueId', data.venueId);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setStep('credentials');
    setSetup2FA(null);
    setError('');
    setForm({ email: '', password: '', venueName: '', totpCode: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="ambient-bg">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      <div className="w-full max-w-sm relative z-10 float-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(168,85,247,0.2))' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-cyan-400">
              <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gradient">EchoVote</h1>
          <p className="text-white/35 text-sm mt-1.5">Let the crowd pick the playlist</p>
        </div>

        {step === 'credentials' && (
          <>
            <div className="glass rounded-xl p-1 flex mb-6">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all ${
                    mode === m
                      ? 'glass-heavy text-white'
                      : 'text-white/35 hover:text-white/55'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-white/40 mb-1.5 block">Venue name</label>
                  <input
                    type="text"
                    placeholder="e.g. The Blue Note"
                    value={form.venueName}
                    onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                    required
                    autoComplete="organization"
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-white/20"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block">Email</label>
                <input
                  type="email"
                  placeholder="admin@venue.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-white/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-white/20"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                  <p className="text-red-400 text-xs font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="glass-button text-cyan-300 font-bold rounded-xl py-3 text-sm mt-1 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                ) : mode === 'login' ? 'Sign in' : 'Create venue'}
              </button>
            </form>
          </>
        )}

        {step === 'setup-2fa' && setup2FA && (
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 float-in">
            <div className="glass rounded-2xl p-5 w-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔐</span>
                <h2 className="text-sm font-bold text-white">Set up two-factor auth</h2>
              </div>
              <p className="text-xs text-white/40 mb-4">
                Scan this QR code with your authenticator app, then enter the 6-digit code below.
              </p>
              <div className="flex justify-center mb-4">
                <img src={setup2FA.qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl" />
              </div>
              <div className="glass-subtle rounded-xl p-2.5">
                <p className="text-[10px] text-white/25 text-center mb-1">Manual entry key</p>
                <p className="text-xs text-white/50 text-center font-mono break-all select-all">{setup2FA.secret}</p>
              </div>
            </div>

            <div className="w-full">
              <label className="text-xs font-semibold text-white/40 mb-1.5 block">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={form.totpCode}
                onChange={(e) => setForm({ ...form, totpCode: e.target.value.replace(/\D/g, '') })}
                required
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 text-center tracking-[0.3em] font-mono"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 w-full">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || form.totpCode.length !== 6}
              className="w-full glass-button text-cyan-300 font-bold rounded-xl py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : 'Verify & complete setup'}
            </button>
          </form>
        )}

        {step === 'verify-2fa' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 float-in">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔐</span>
                <h2 className="text-sm font-bold text-white">Two-factor authentication</h2>
              </div>
              <p className="text-xs text-white/40">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/40 mb-1.5 block">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={form.totpCode}
                onChange={(e) => setForm({ ...form, totpCode: e.target.value.replace(/\D/g, '') })}
                autoFocus
                required
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 text-center tracking-[0.3em] font-mono"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || form.totpCode.length !== 6}
              className="w-full glass-button text-cyan-300 font-bold rounded-xl py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setError(''); setForm({ ...form, totpCode: '' }); }}
              className="text-xs text-white/25 hover:text-white/50 transition-colors font-medium"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
