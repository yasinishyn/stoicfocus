import { describe, it, expect } from 'vitest';
import { computeDomainBlockStats } from '../src/analyticsUtils';
import type { BlockedSite } from '../src/types';

const makeDomain = (domain: string, listType: 'blocklist' | 'greylist' | 'whitelist', redirectCount = 0): BlockedSite => ({
  id: `${domain}-${listType}`,
  domain,
  type: 'domain',
  category: 'custom',
  listType,
  redirectCount,
});

const makeCategory = (category: string, listType: 'blocklist' | 'greylist' | 'whitelist', redirectCount = 0): BlockedSite => ({
  id: `${category}-${listType}`,
  domain: category,
  type: 'category',
  category,
  listType,
  redirectCount,
});

describe('computeDomainBlockStats', () => {
  it('counts blocklist domains by redirectCount', () => {
    const sites: BlockedSite[] = [
      makeDomain('a.com', 'blocklist', 3),
      makeDomain('b.com', 'blocklist', 1),
      makeDomain('a.com', 'greylist', 5), // ignored (not blocklist)
    ];
    const stats = computeDomainBlockStats(sites, {});
    expect(stats).toEqual([
      { domain: 'a.com', count: 3 },
      { domain: 'b.com', count: 1 },
    ]);
  });

  it('distributes category redirectCount across its domains', () => {
    const sites: BlockedSite[] = [
      makeCategory('social', 'blocklist', 4),
    ];
    const cats = { social: ['x.com', 'y.com'] };
    const stats = computeDomainBlockStats(sites, cats);
    expect(stats).toEqual([
      { domain: 'x.com', count: 4 },
      { domain: 'y.com', count: 4 },
    ]);
  });

  it('merges and sorts by count then domain', () => {
    const sites: BlockedSite[] = [
      makeDomain('b.com', 'blocklist', 2),
      makeDomain('a.com', 'blocklist', 2),
      makeDomain('c.com', 'blocklist', 5),
    ];
    const stats = computeDomainBlockStats(sites, {});
    expect(stats.map(s => s.domain)).toEqual(['c.com', 'a.com', 'b.com']); // count desc, domain asc
  });

  it('returns empty for no blocklist data', () => {
    const sites: BlockedSite[] = [
      makeDomain('a.com', 'greylist', 3),
      makeDomain('b.com', 'whitelist', 2),
    ];
    const stats = computeDomainBlockStats(sites, {});
    expect(stats).toEqual([]);
  });
});

