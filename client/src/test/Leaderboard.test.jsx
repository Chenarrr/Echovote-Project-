import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Leaderboard from '../components/Leaderboard';

const makeEntry = (id, title, voteCount, addedBy = 'other') => ({
  _id: id,
  voteCount,
  songId: { _id: `s-${id}`, title, artist: 'A', thumbnail: 't.jpg', addedBy },
});

describe('Leaderboard', () => {
  // RTL-07
  test('RTL-07: empty queue shows "The stage is empty" empty state', () => {
    render(
      <Leaderboard
        queue={[]}
        votedSongs={new Set()}
        onVote={() => {}}
        onUnvote={() => {}}
        fingerprint="fp"
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/the stage is empty/i)).toBeInTheDocument();
  });

  // RTL-08
  test('RTL-08: renders a SongCard per queue entry and a "tracks queued" counter', () => {
    const queue = [makeEntry('a', 'First', 3), makeEntry('b', 'Second', 1)];
    render(
      <Leaderboard
        queue={queue}
        votedSongs={new Set()}
        onVote={() => {}}
        onUnvote={() => {}}
        fingerprint="fp"
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText(/2 tracks queued/i)).toBeInTheDocument();
  });
});
