import { describe, it, expect } from 'vitest';
import { computeTabSummary, SimpleTab } from '../src/tabUtils';

const baseSettings = { enabled: true, mementoMoriEnabled: true, tabLimit: 5 };

describe('computeTabSummary', () => {
  it('returns null when disabled', () => {
    const res = computeTabSummary([], { ...baseSettings, enabled: false }, {});
    expect(res).toBeNull();
  });

  it('returns null when memento mori is off', () => {
    const res = computeTabSummary([], { ...baseSettings, mementoMoriEnabled: false }, {});
    expect(res).toBeNull();
  });

  it('counts only unpinned tabs and applies limit', () => {
    const tabs: SimpleTab[] = [
      { id: 1, pinned: true, title: 'Pinned', url: 'https://a.com' },
      { id: 2, pinned: false, title: 'One', url: 'https://b.com' },
      { id: 3, pinned: false, title: 'Two', url: 'https://c.com' }
    ];
    const res = computeTabSummary(tabs, { ...baseSettings, tabLimit: 2 }, {});
    expect(res).not.toBeNull();
    expect(res?.count).toBe(2);
    expect(res?.limit).toBe(2);
    expect(res?.overLimit).toBe(false);
  });

  it('flags over-limit correctly', () => {
    const tabs: SimpleTab[] = [
      { id: 2, pinned: false, title: 'One', url: 'https://b.com' },
      { id: 3, pinned: false, title: 'Two', url: 'https://c.com' },
      { id: 4, pinned: false, title: 'Three', url: 'https://d.com' }
    ];
    const res = computeTabSummary(tabs, { ...baseSettings, tabLimit: 2 }, {});
    expect(res?.overLimit).toBe(true);
    expect(res?.count).toBe(3);
  });

  it('includes usage counts per tab', () => {
    const tabs: SimpleTab[] = [
      { id: 10, pinned: false, title: 'A', url: 'https://a.com' }
    ];
    const res = computeTabSummary(tabs, baseSettings, { 10: 7 });
    expect(res?.tabs[0].usage).toBe(7);
  });

  it('fills defaults for title/url and id', () => {
    const tabs: SimpleTab[] = [
      { pinned: false }
    ];
    const res = computeTabSummary(tabs, baseSettings, {});
    expect(res?.tabs[0].id).toBe(0);
    expect(res?.tabs[0].title).toBe('(untitled)');
    expect(res?.tabs[0].url).toBe('');
  });
});

