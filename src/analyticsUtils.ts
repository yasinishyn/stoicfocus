import { BlockedSite } from './types';

export const computeDomainBlockStats = (
  blockedSites: BlockedSite[],
  categoryDefinitions: Record<string, string[]>
): Array<{ domain: string; count: number }> => {
  const counts: Record<string, number> = {};
  const add = (domain: string, val: number) => {
    const key = domain.toLowerCase();
    counts[key] = (counts[key] || 0) + (val || 0);
  };

  blockedSites.forEach((site) => {
    const lt = (site.listType === 'blacklist' ? 'blocklist' : site.listType) as string;
    if (lt !== 'blocklist') return;
    if (site.type === 'domain') {
      add(site.domain, site.redirectCount || 0);
    } else {
      const domains = categoryDefinitions[site.category] || [];
      const val = site.redirectCount || 0;
      domains.forEach((d) => add(d, val));
    }
  });

  return Object.entries(counts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
};

