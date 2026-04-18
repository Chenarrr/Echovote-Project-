import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  searchSongs: vi.fn(),
  addSong: vi.fn(),
}));

import SearchBar from '../components/SearchBar';
import { searchSongs, addSong } from '../services/api';

beforeEach(() => {
  searchSongs.mockReset();
  addSong.mockReset();
});

describe('SearchBar', () => {
  // RTL-04
  test('RTL-04: typing a query and submitting calls searchSongs and renders results', async () => {
    searchSongs.mockResolvedValueOnce({
      data: [
        { youtubeId: 'y1', title: 'Alpha Track', artist: 'A', thumbnail: 'x.jpg', isExplicit: false },
        { youtubeId: 'y2', title: 'Beta Track', artist: 'B', thumbnail: 'x.jpg', isExplicit: true },
      ],
    });

    render(<SearchBar venueId="v1" fingerprint="fp" onSongAdded={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/search artist or song/i), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(searchSongs).toHaveBeenCalledWith('alpha'));
    expect(await screen.findByText('Alpha Track')).toBeInTheDocument();
    expect(screen.getByText('Beta Track')).toBeInTheDocument();
  });

  // RTL-05
  test('RTL-05: clicking "Add" calls addSong with fingerprint and removes the result from the list', async () => {
    searchSongs.mockResolvedValueOnce({
      data: [{ youtubeId: 'y1', title: 'OnlyOne', artist: 'A', thumbnail: 'x.jpg', isExplicit: false }],
    });
    addSong.mockResolvedValueOnce({ data: {} });
    const onSongAdded = vi.fn();

    render(<SearchBar venueId="v1" fingerprint="fp-x" onSongAdded={onSongAdded} />);
    await userEvent.type(screen.getByPlaceholderText(/search artist or song/i), 'only');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    const addBtn = await screen.findByRole('button', { name: /^add$/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(addSong).toHaveBeenCalledWith('v1', expect.objectContaining({ youtubeId: 'y1', addedBy: 'fp-x' }));
    });
    expect(onSongAdded).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('OnlyOne')).not.toBeInTheDocument();
  });

  // RTL-06
  test('RTL-06: addSong failure surfaces error via onError callback', async () => {
    searchSongs.mockResolvedValueOnce({
      data: [{ youtubeId: 'y1', title: 'OnlyOne', artist: 'A', thumbnail: 'x.jpg', isExplicit: false }],
    });
    addSong.mockRejectedValueOnce({
      response: { data: { error: 'You can only add up to 2 songs. Remove one to add another.' } },
    });
    const onError = vi.fn();

    render(<SearchBar venueId="v1" fingerprint="fp" onSongAdded={() => {}} onError={onError} />);
    await userEvent.type(screen.getByPlaceholderText(/search artist or song/i), 'only');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    const addBtn = await screen.findByRole('button', { name: /^add$/i });
    await userEvent.click(addBtn);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/up to 2 songs/i)));
  });
});
