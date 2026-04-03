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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
          EchoVote
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">Admin Portal</p>

        <div className="flex rounded-xl overflow-hidden border border-brand-border mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                mode === m ? 'bg-brand-purple text-white' : 'bg-brand-card text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Venue name"
              value={form.venueName}
              onChange={(e) => setForm({ ...form, venueName: e.target.value })}
              required
              className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple"
          />

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-purple hover:bg-violet-600 text-white rounded-xl py-3 text-sm font-bold mt-2 transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
