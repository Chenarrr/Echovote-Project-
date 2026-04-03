import React, { useState } from 'react';
import { searchSongs, addSong } from '../services/api';

const SearchBar = ({ venueId, onSongAdded }) => {
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
      await addSong(venueId, song);
      onSongAdded?.();
      setResults([]);
      setQuery('');
    } catch (err) {
      alert(err.response?.data?.error || 'Could not add song');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song..."
          className="flex-1 bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-purple hover:bg-violet-600 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-2 bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          {results.map((song) => (
            <div key={song.youtubeId} className="flex items-center gap-3 p-3 border-b border-brand-border last:border-0">
              <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
              </div>
              <button
                onClick={() => handleAdd(song)}
                disabled={adding === song.youtubeId}
                className="text-xs bg-brand-purple hover:bg-violet-600 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
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
