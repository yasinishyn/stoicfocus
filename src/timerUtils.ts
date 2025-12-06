export type PomoMode = 'focus' | 'break';

export const getTransitionNotice = (
  mode: PomoMode,
  nextTimeLeft: number,
  alreadyNotified: boolean
): string | null => {
  if (alreadyNotified) return null;
  if (nextTimeLeft !== 10) return null;
  return mode === 'focus' ? 'Rest begins in 10 seconds.' : 'Rest ends in 10 seconds.';
};

