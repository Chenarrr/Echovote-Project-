import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import Leaderboard from '../components/Leaderboard';

const makeEntry = (id, title, voteCount, addedBy = 'other') => ({
  _id: id,
  voteCount,
  songId: { _id: `s-${id}`, title, artist: 'A', thumbnail: 't.jpg', addedBy },
});

describe('Leaderboard', () => {
  // RTL-07
  test('RTL-07: empty queue shows "No songs yet" empty state', () => {
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
    expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
  });

  // RTL-08
  test('RTL-08: renders a SongCard per queue entry and a queue count pill', () => {
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
    // Queue header renders a stat-pill showing the count (appears at least once)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });
});
