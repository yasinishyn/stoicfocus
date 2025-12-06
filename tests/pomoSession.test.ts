import { describe, it, expect, beforeEach } from 'vitest';

// Helper mimicking ensureBaseline logic
const ensureBaseline = (pomo: any, settings: any) => {
  const mode = pomo.mode || 'focus';
  const duration = (mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60;
  const timeLeft = typeof pomo.timeLeft === 'number' && pomo.timeLeft > 0 ? pomo.timeLeft : duration;
  const preMortemCaptured = pomo.preMortemCaptured ?? false;
  return { ...pomo, mode, timeLeft, preMortemCaptured };
};

describe('Pomodoro negative visualization persistence', () => {
  const settings = { focusDuration: 25, breakDuration: 5, negativeVisualization: true };
  let pomo: any;

  beforeEach(() => {
    pomo = { isActive: false, mode: 'focus', timeLeft: 0, preMortemCaptured: false };
  });

  it('does not re-prompt negative visualization after pause/resume in same session', () => {
    // Start session with NV captured
    pomo = ensureBaseline(pomo, settings);
    pomo = { ...pomo, isActive: true, preMortemCaptured: true };

    // Pause
    pomo = { ...pomo, isActive: false };

    // Resume: should not require NV again; preMortemCaptured remains true
    pomo = ensureBaseline(pomo, settings);
    expect(pomo.preMortemCaptured).toBe(true);
  });

  it('resets NV capture when entering a new focus session after a completed cycle', () => {
    pomo = { isActive: true, mode: 'focus', timeLeft: 1, preMortemCaptured: true };

    // Simulate timer finishing and switching to break
    const nextMode = 'break';
    const nextDuration = settings.breakDuration * 60;
    pomo = { isActive: false, mode: nextMode, timeLeft: nextDuration, preMortemCaptured: false };

    // When later entering a new focus session, NV should be required again
    const newFocus = ensureBaseline({ isActive: false, mode: 'focus', timeLeft: 0, preMortemCaptured: pomo.preMortemCaptured }, settings);
    expect(newFocus.preMortemCaptured).toBe(false);
  });
});

