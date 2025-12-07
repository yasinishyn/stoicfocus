export type TabHash = 'dashboard' | 'greylist' | 'whitelist' | 'analytics' | 'settings' | 'manual';

export const hashToTab = (hash: string): TabHash => {
  const h = hash.replace('#', '');
  if (h === 'greylist' || h === 'whitelist' || h === 'analytics' || h === 'settings' || h === 'manual') {
    return h;
  }
  return 'dashboard';
};

export const tabToHash = (tab: TabHash): string => {
  return tab === 'dashboard' ? '' : `#${tab}`;
};

