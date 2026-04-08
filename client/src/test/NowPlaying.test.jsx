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
    // 65s should format as 1:05; 180s as 3:00
    expect(screen.getByText(/1:05/)).toBeInTheDocument();
    expect(screen.getByText(/3:00/)).toBeInTheDocument();

    // Click the 🔥 reaction
    await userEvent.click(screen.getByRole('button', { name: '🔥' }));
    expect(onReaction).toHaveBeenCalledWith('fire');
  });
});
