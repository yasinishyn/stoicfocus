import { describe, it, expect } from 'vitest';
import { getCategoryLabel } from '../components/DashboardComponent';

describe('getCategoryLabel', () => {
  const cats = {
    social: ['x.com', 'facebook.com'],
    custom123: ['mydomain.com'],
  };

  it('returns predefined label for known keys', () => {
    expect(getCategoryLabel('social', cats)).toBe('Social Media');
    expect(getCategoryLabel('news', cats)).toBe('News & Media');
    expect(getCategoryLabel('shopping', cats)).toBe('Shopping');
    expect(getCategoryLabel('entertainment', cats)).toBe('Entertainment');
    expect(getCategoryLabel('custom', cats)).toBe('Custom');
  });

  it('falls back to first domain for unknown category with domains', () => {
    expect(getCategoryLabel('custom123', cats)).toBe('mydomain.com');
  });

  it('falls back to key when no domains', () => {
    expect(getCategoryLabel('unknown', {})).toBe('unknown');
  });
});

