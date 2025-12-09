import { describe, it, expect } from 'vitest';
import { resolveCreatedTab } from '../src/tabUtils';

describe('resolveCreatedTab', () => {
  const makeTab = (id: number) => ({ id } as any);

  it('returns queried tab when available', () => {
    const created = makeTab(1);
    const queried = [makeTab(2)];
    expect(resolveCreatedTab(created, queried)).toBe(queried[0]);
  });

  it('falls back to created tab when queried is empty/undefined', () => {
    const created = makeTab(1);
    expect(resolveCreatedTab(created, [])).toBe(created);
    expect(resolveCreatedTab(created)).toBe(created);
  });
});

