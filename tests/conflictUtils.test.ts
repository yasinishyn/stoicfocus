import { describe, it, expect } from 'vitest';
import { buildConflictMessage, categoryHasConflicts, getDomainConflicts, hasSiteConflicts, type CategoryDefinitions } from '../src/conflictUtils';
import type { BlockedSite } from '../src/types';

const makeDomain = (domain: string, listType: 'blocklist' | 'greylist' | 'whitelist'): BlockedSite => ({
  id: `${domain}-${listType}`,
  domain,
  type: 'domain',
  category: 'custom',
  listType,
  redirectCount: 0,
});

const makeCategory = (category: string, domains: string[], listType: 'blocklist' | 'greylist' | 'whitelist'): BlockedSite => ({
  id: `${category}-${listType}`,
  domain: category,
  type: 'category',
  category,
  listType,
  redirectCount: 0,
});

describe('conflictUtils', () => {
  const baseCats: CategoryDefinitions = {
    focus: ['focus.com'],
    social: ['social.com'],
  };

  it('detects conflicts across all lists with proper priority', () => {
    const blockedSites: BlockedSite[] = [
      makeDomain('example.com', 'blocklist'),
      makeDomain('example.com', 'greylist'),
      makeDomain('example.com', 'whitelist'),
    ];

    const conflictsGrey = getDomainConflicts('example.com', 'greylist', blockedSites, baseCats);
    const conflictsWhite = getDomainConflicts('example.com', 'whitelist', blockedSites, baseCats);
    const conflictsBlock = getDomainConflicts('example.com', 'blocklist', blockedSites, baseCats);

    expect(conflictsGrey[0].listType).toBe('blocklist'); // blocklist wins
    expect(conflictsWhite[0].listType).toBe('blocklist');
    expect(conflictsBlock[0].listType).toBe('greylist'); // highest other list when viewing blocklist
  });

  it('builds correct messages per current list type', () => {
    const blockedSites: BlockedSite[] = [
      makeDomain('example.com', 'blocklist'),
      makeDomain('example.com', 'greylist'),
    ];

    const conflictsGrey = getDomainConflicts('example.com', 'greylist', blockedSites, baseCats);
    const conflictsWhite = getDomainConflicts('example.com', 'whitelist', blockedSites, baseCats);

    expect(buildConflictMessage('greylist', conflictsGrey)).toBe('BLOCKLIST RULE APPLIED');
    expect(buildConflictMessage('whitelist', conflictsWhite)).toBe('BLOCKLIST RULE APPLIED');
  });

  it('handles greylist vs whitelist precedence when blocklist absent', () => {
    const blockedSites: BlockedSite[] = [
      makeDomain('example.com', 'greylist'),
      makeDomain('example.com', 'whitelist'),
    ];

    const conflictsGrey = getDomainConflicts('example.com', 'greylist', blockedSites, baseCats);
    const conflictsWhite = getDomainConflicts('example.com', 'whitelist', blockedSites, baseCats);

    expect(buildConflictMessage('greylist', conflictsGrey)).toBe('GREYLIST OVERRIDES WHITELIST');
    expect(buildConflictMessage('whitelist', conflictsWhite)).toBe('GREYLIST OVERRIDES WHITELIST');
  });

  it('detects category conflicts and flags group + inner domains', () => {
    const cats: CategoryDefinitions = {
      focus: ['shared.com', 'unique.com'],
      social: ['other.com'],
    };
    const blockedSites: BlockedSite[] = [
      makeCategory('focus', cats.focus, 'greylist'),
      makeDomain('shared.com', 'blocklist'),
    ];

    expect(categoryHasConflicts('focus', 'greylist', blockedSites, cats)).toBe(true);
    expect(hasSiteConflicts(blockedSites[0], 'greylist', blockedSites, cats)).toBe(true);

    const domainConflicts = getDomainConflicts('shared.com', 'greylist', blockedSites, cats);
    expect(buildConflictMessage('greylist', domainConflicts)).toBe('BLOCKLIST RULE APPLIED');
  });

  it('returns no conflicts for clean, non-overlapping domains', () => {
    const cats: CategoryDefinitions = { focus: ['a.com'] };
    const blockedSites: BlockedSite[] = [
      makeDomain('a.com', 'blocklist'),
      makeDomain('b.com', 'greylist'),
      makeCategory('focus', cats.focus, 'whitelist'),
    ];

    const conflicts = getDomainConflicts('b.com', 'greylist', blockedSites, cats);
    expect(conflicts.length).toBe(0);
    expect(buildConflictMessage('greylist', conflicts)).toBe('');
  });
});

