import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import SongCard from '../components/SongCard';

const entry = {
  _id: 'q1',
  voteCount: 5,
  songId: { _id: 's1', title: 'My Song', artist: 'My Artist', thumbnail: 't.jpg', addedBy: 'me' },
};

describe('SongCard', () => {
  // RTL-09
  test('RTL-09: renders title, artist, vote count, and shows delete button only when canDelete=true', () => {
    const { rerender } = render(
      <SongCard entry={entry} rank={2} voted={false} onVote={() => {}} onUnvote={() => {}} canDelete={false} onDelete={() => {}} />
    );
    expect(screen.getByText('My Song')).toBeInTheDocument();
    expect(screen.getByText('My Artist')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByTitle(/remove your song/i)).not.toBeInTheDocument();

    rerender(
      <SongCard entry={entry} rank={2} voted={false} onVote={() => {}} onUnvote={() => {}} canDelete={true} onDelete={() => {}} />
    );
    expect(screen.getByTitle(/remove your song/i)).toBeInTheDocument();
  });

  // RTL-10
  test('RTL-10: clicking vote triggers onVote with (entry._id, song._id)', async () => {
    const onVote = vi.fn();
    render(
      <SongCard entry={entry} rank={1} voted={false} onVote={onVote} onUnvote={() => {}} canDelete={false} onDelete={() => {}} />
    );
    // The VoteButton is the only role=button in this card when canDelete=false
    await userEvent.click(screen.getByRole('button'));
    expect(onVote).toHaveBeenCalledWith('q1', 's1');
  });
});
