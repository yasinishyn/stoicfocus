import { describe, it, expect } from 'vitest';
import { hashToTab, tabToHash } from '../src/tabHash';

describe('tab hash mapping', () => {
  it('hashToTab maps known hashes', () => {
    expect(hashToTab('#settings')).toBe('settings');
    expect(hashToTab('#greylist')).toBe('greylist');
    expect(hashToTab('#whitelist')).toBe('whitelist');
    expect(hashToTab('#analytics')).toBe('analytics');
    expect(hashToTab('#manual')).toBe('manual');
    expect(hashToTab('#dashboard')).toBe('dashboard');
  });

  it('hashToTab defaults unknown/empty to dashboard', () => {
    expect(hashToTab('#unknown')).toBe('dashboard');
    expect(hashToTab('')).toBe('dashboard');
  });

  it('tabToHash maps tabs to hash strings', () => {
    expect(tabToHash('settings')).toBe('#settings');
    expect(tabToHash('greylist')).toBe('#greylist');
    expect(tabToHash('whitelist')).toBe('#whitelist');
    expect(tabToHash('analytics')).toBe('#analytics');
    expect(tabToHash('manual')).toBe('#manual');
    expect(tabToHash('dashboard')).toBe('');
  });
});

