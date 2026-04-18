import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import NowPlaying from '../components/NowPlaying';

describe('NowPlaying', () => {
  // RTL-11
  test('RTL-11: returns null when no song is playing', () => {
    const { container } = render(<NowPlaying song={null} />);
    expect(container.firstChild).toBeNull();
  });

  // RTL-12
  test('RTL-12: renders song title + formatted time and fires reaction callback', async () => {
    const onReaction = vi.fn();
    render(
      <NowPlaying
        song={{ title: 'Track Z', thumbnail: 't.jpg' }}
        progress={{ currentTime: 65, duration: 180 }}
        onReaction={onReaction}
      />
    );
    expect(screen.getByText('Track Z')).toBeInTheDocument();
    // Time rendered in both mobile + desktop layouts (jsdom has no CSS media queries)
    expect(screen.getAllByText(/1:05/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3:00/).length).toBeGreaterThan(0);

    // Fire the first matching reaction button (desktop emoji-only variant)
    const fireButtons = screen.getAllByRole('button', { name: /🔥/ });
    await userEvent.click(fireButtons[0]);
    expect(onReaction).toHaveBeenCalledWith('fire');
  });
});
