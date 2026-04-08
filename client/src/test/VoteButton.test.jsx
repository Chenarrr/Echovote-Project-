import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import VoteButton from '../components/VoteButton';

describe('VoteButton', () => {
  // RTL-01
  test('RTL-01: renders the current count', () => {
    render(<VoteButton count={7} voted={false} onClick={() => {}} onUnvote={() => {}} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  // RTL-02
  test('RTL-02: when not voted, clicking calls onClick (not onUnvote)', async () => {
    const onClick = vi.fn();
    const onUnvote = vi.fn();
    render(<VoteButton count={3} voted={false} onClick={onClick} onUnvote={onUnvote} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onUnvote).not.toHaveBeenCalled();
  });

  // RTL-03
  test('RTL-03: when already voted, clicking calls onUnvote (not onClick)', async () => {
    const onClick = vi.fn();
    const onUnvote = vi.fn();
    render(<VoteButton count={4} voted={true} onClick={onClick} onUnvote={onUnvote} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onUnvote).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
