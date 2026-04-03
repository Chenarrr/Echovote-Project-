import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, adminRegister } from '../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', venueName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        ({ data } = await adminLogin(form.email, form.password));
      } else {
        ({ data } = await adminRegister(form.email, form.password, form.venueName));
      }
      localStorage.setItem('echovote_token', data.token);
      localStorage.setItem('echovote_venueId', data.venueId);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-accent">
              <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-surface-100">EchoVote</h1>
          <p className="text-surface-400 text-sm mt-1">Venue administration</p>
        </div>

        <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg p-1 flex mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                mode === m
                  ? 'bg-surface-700 text-surface-100 shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Venue name</label>
              <input
                type="text"
                placeholder="e.g. The Blue Note"
                value={form.venueName}
                onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                required
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:border-accent transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Email</label>
            <input
              type="email"
              placeholder="admin@venue.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:bg-accent-hover text-white rounded-lg py-2.5 text-sm font-medium mt-1 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? 'Sign in' : 'Create venue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
