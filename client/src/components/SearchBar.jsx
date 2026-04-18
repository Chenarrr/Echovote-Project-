import React, { useState } from 'react';
import { searchSongs, addSong } from '../services/api';

const SearchBar = ({ venueId, onSongAdded, fingerprint, onError }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const visibleResults = results.slice(0, 6);

  const reportError = (err, fallback) => {
    onError?.(err.response?.data?.error || err.message || fallback);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await searchSongs(query);
      setResults(data);
    } catch (err) {
      setResults([]);
      reportError(err, 'Could not search songs');
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
      reportError(err, 'Could not add song');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-5 float-in glass-heavy panel-shell rounded-[26px] p-4 sm:p-5" style={{ animationDelay: '100ms', opacity: 0 }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/42 font-semibold">Search</p>
          <h2 className="display-type text-[1.15rem] font-semibold text-white mt-1">Add song</h2>
        </div>
        {results.length > 0 && (
          <span className="stat-pill !px-3 !py-1 text-[11px]">{visibleResults.length}</span>
        )}
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
            placeholder="Search artist or song"
            autoComplete="off"
            className="w-full glass-input rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/35"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button text-cyan-100 rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-50 min-w-[92px]"
        >
          {loading ? (
            <div className="mx-auto w-4 h-4 border-2 border-cyan-100/30 border-t-cyan-100 rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </form>

      {visibleResults.length > 0 && (
        <div className="mt-4 max-h-[360px] overflow-y-auto glass rounded-[24px] divide-y divide-white/[0.05]">
          {visibleResults.map((song, i) => (
            <div
              key={song.youtubeId}
              className="flex items-center gap-3 p-3.5 hover:bg-white/[0.05] transition-colors float-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
            >
              <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 ring-1 ring-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white/95 truncate">{song.title}</p>
                  {song.isExplicit && (
                    <span className="flex-shrink-0 text-[9px] font-bold bg-white/10 text-white/55 rounded px-1 py-0.5 uppercase">E</span>
                  )}
                </div>
                <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
              </div>
              <button
                onClick={() => handleAdd(song)}
                disabled={adding === song.youtubeId}
                className="text-xs font-bold text-cyan-100 glass-button rounded-2xl px-4 py-2.5 disabled:opacity-50 flex-shrink-0"
              >
                {adding === song.youtubeId ? '...' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
