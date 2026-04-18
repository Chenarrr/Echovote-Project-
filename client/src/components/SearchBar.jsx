import React, { useState } from 'react';
import { searchSongs, addSong } from '../services/api';

const SearchBar = ({ venueId, onSongAdded, fingerprint }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await searchSongs(query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (song) => {
    setAdding(song.youtubeId);
    try {
      await addSong(venueId, { ...song, addedBy: fingerprint });
      onSongAdded?.();
      setResults((prev) => prev.filter((s) => s.youtubeId !== song.youtubeId));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not add song');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-6 float-in glass-heavy panel-shell rounded-[28px] p-4 sm:p-5" style={{ animationDelay: '100ms', opacity: 0 }}>
      <div className="mb-4">
        <p className="section-kicker">Crowd Control</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Pick the next track</h2>
            <p className="section-copy mt-1">Search YouTube, add a song, then let the room decide what climbs.</p>
          </div>
          <span className="stat-pill">Live requests</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            id="song-search"
            name="song-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by song, artist, or mood"
            autoComplete="off"
            className="w-full glass-input rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/35"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button text-cyan-100 rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-50 min-w-[98px]"
        >
          {loading ? (
            <div className="mx-auto w-4 h-4 border-2 border-cyan-100/30 border-t-cyan-100 rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </form>

      <p className="fine-print mt-3">Fast add, low friction, and no app install for guests.</p>

      {results.length > 0 && (
        <div className="mt-4 glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
          {results.map((song, i) => (
            <div
              key={song.youtubeId}
              className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors float-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
            >
              <img src={song.thumbnail} alt={song.title} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  {song.isExplicit && (
                    <span className="flex-shrink-0 text-[9px] font-bold bg-white/10 text-white/55 rounded px-1 py-0.5 uppercase">E</span>
                  )}
                </div>
                <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
              </div>
              <button
                onClick={() => handleAdd(song)}
                disabled={adding === song.youtubeId}
                className="text-xs font-bold text-cyan-100 glass-button rounded-xl px-3.5 py-2 disabled:opacity-50 flex-shrink-0"
              >
                {adding === song.youtubeId ? '...' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
