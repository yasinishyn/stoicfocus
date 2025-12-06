import { describe, it, expect } from 'vitest';
import { getTransitionNotice } from '../src/timerUtils';

describe('timerUtils - transition notices', () => {
  it('notifies 10s before switching from focus to break', () => {
    const msg = getTransitionNotice('focus', 10, false);
    expect(msg).toBe('Rest begins in 10 seconds.');
  });

  it('notifies 10s before break ends', () => {
    const msg = getTransitionNotice('break', 10, false);
    expect(msg).toBe('Rest ends in 10 seconds.');
  });

  it('does not notify when already notified', () => {
    const msg = getTransitionNotice('focus', 10, true);
    expect(msg).toBeNull();
  });

  it('does not notify at other times', () => {
    const msg = getTransitionNotice('focus', 9, false);
    expect(msg).toBeNull();
  });
});

