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
    <div className="mb-5">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            id="song-search"
            name="song-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song..."
            autoComplete="off"
            className="w-full glass-input rounded-glass pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-accent/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button text-accent rounded-glass px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-2 glass rounded-glass overflow-hidden divide-y divide-white/[0.06]">
          {results.map((song) => (
            <div key={song.youtubeId} className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors">
              <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  {song.isExplicit && <span className="flex-shrink-0 text-[10px] font-bold bg-white/10 text-white/50 rounded px-1 py-0.5">E</span>}
                </div>
                <p className="text-xs text-white/40 truncate mt-0.5">{song.artist}</p>
              </div>
              <button
                onClick={() => handleAdd(song)}
                disabled={adding === song.youtubeId}
                className="text-xs glass-button text-accent rounded-lg px-3 py-1.5 font-medium disabled:opacity-50 flex-shrink-0"
              >
                {adding === song.youtubeId ? '...' : 'Add to queue'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
