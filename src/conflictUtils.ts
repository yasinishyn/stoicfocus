import { BlockedSite } from './types';

export type ListType = 'blocklist' | 'greylist' | 'whitelist';
export type Conflict = { listType: ListType; category?: string };
export type CategoryDefinitions = Record<string, string[]>;

const priority = (lt: ListType): number => {
  if (lt === 'blocklist') return 3;
  if (lt === 'greylist') return 2;
  return 1; // whitelist
};

const normalizeListType = (lt: string): ListType => {
  if (lt === 'blacklist') return 'blocklist';
  if (lt === 'greylist') return 'greylist';
  if (lt === 'whitelist') return 'whitelist';
  return 'blocklist';
};

const normalizeDomain = (d: string): string =>
  d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

export const domainsMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const da = normalizeDomain(a);
  const db = normalizeDomain(b);
  return da === db || da.endsWith(`.${db}`) || db.endsWith(`.${da}`);
};

export const getDomainConflicts = (
  domain: string,
  currentListType: ListType,
  blockedSites: BlockedSite[],
  categoryDefinitions: CategoryDefinitions
): Conflict[] => {
  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  blockedSites.forEach((s) => {
    const lt = normalizeListType(s.listType);
    if (lt === currentListType) return;

    const match =
      s.type === 'domain'
        ? domainsMatch(s.domain, domain)
        : (categoryDefinitions[s.category] || []).some((d) => domainsMatch(d, domain));

    if (match) {
      if (!seen.has(lt)) {
        conflicts.push({ listType: lt, category: s.category });
        seen.add(lt);
      }
    }
  });

  return conflicts.sort((a, b) => priority(b.listType) - priority(a.listType));
};

export const categoryHasConflicts = (
  categoryKey: string,
  currentListType: ListType,
  blockedSites: BlockedSite[],
  categoryDefinitions: CategoryDefinitions
): boolean => {
  const domains = categoryDefinitions[categoryKey] || [];
  return domains.some((domain) => getDomainConflicts(domain, currentListType, blockedSites, categoryDefinitions).length > 0);
};

export const hasSiteConflicts = (
  site: BlockedSite,
  currentListType: ListType,
  blockedSites: BlockedSite[],
  categoryDefinitions: CategoryDefinitions
): boolean => {
  if (site.type === 'domain') {
    return getDomainConflicts(site.domain, currentListType, blockedSites, categoryDefinitions).length > 0;
  }
  const domains = categoryDefinitions[site.category] || [];
  return domains.some((d) => getDomainConflicts(d, currentListType, blockedSites, categoryDefinitions).length > 0);
};

export const buildConflictMessage = (
  currentListType: ListType,
  conflicts: Conflict[]
): string => {
  if (!conflicts.length) return '';
  const hasBlock = conflicts.some((c) => c.listType === 'blocklist');
  const hasGrey = conflicts.some((c) => c.listType === 'greylist');
  const hasWhite = conflicts.some((c) => c.listType === 'whitelist');

  if (currentListType === 'blocklist') {
    if (hasGrey) return 'BLOCKLIST OVERRIDES GREYLIST';
    if (hasWhite) return 'BLOCKLIST OVERRIDES WHITELIST';
    return '';
  }

  if (currentListType === 'greylist') {
    if (hasBlock) return 'BLOCKLIST RULE APPLIED';
    if (hasWhite) return 'GREYLIST OVERRIDES WHITELIST';
    return '';
  }

  // whitelist
  if (hasBlock) return 'BLOCKLIST RULE APPLIED';
  if (hasGrey) return 'GREYLIST OVERRIDES WHITELIST';
  return '';
};

