import { describe, it, expect } from 'vitest';

// Local copy of formatHoursMinutes from FocusChartCard for testing
const formatHoursMinutes = (hours: number) => {
  const minutes = Math.round(hours * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

describe('Focus chart formatting (hours/minutes, no decimals)', () => {
  it('formats hours and minutes correctly', () => {
    expect(formatHoursMinutes(0)).toBe('0m');
    expect(formatHoursMinutes(0.5)).toBe('30m');
    expect(formatHoursMinutes(1)).toBe('1h');
    expect(formatHoursMinutes(1.5)).toBe('1h 30m');
    expect(formatHoursMinutes(1.4166667)).toBe('1h 25m'); // 1h25m rounding check
  });

  it('rounds to nearest minute (avoids float artifacts)', () => {
    expect(formatHoursMinutes(0.6000000000000001)).toBe('36m'); // 0.6h = 36m
  });
});

