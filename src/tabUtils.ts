export const resolveCreatedTab = (
  createdTab: chrome.tabs.Tab,
  queriedTabs?: chrome.tabs.Tab[]
): chrome.tabs.Tab => {
  if (queriedTabs && queriedTabs.length > 0) {
    return queriedTabs[0];
  }
  return createdTab;
};

export interface SimpleTab {
  id?: number;
  pinned?: boolean;
  title?: string;
  url?: string;
  active?: boolean;
}

export interface TabSummary {
  count: number;
  limit: number;
  overLimit: boolean;
  tabs: Array<{ id: number; title: string; url: string; active?: boolean; usage?: number; pinned?: boolean; lastAccessed?: number }>;
}

interface TabLimitSettings {
  enabled: boolean;
  mementoMoriEnabled: boolean;
  tabLimit: number;
}

export const computeTabSummary = (
  tabs: SimpleTab[],
  settings: TabLimitSettings,
  usage: Record<number, number> = {}
): TabSummary | null => {
  if (!settings.enabled || !settings.mementoMoriEnabled) return null;
  const limit = settings.tabLimit || 0;
  const unpinned = tabs.filter(t => !t.pinned);
  const count = unpinned.length;
  const overLimit = limit > 0 ? count > limit : false;
  const entries = unpinned.map(t => ({
    id: t.id ?? 0,
    title: t.title || '(untitled)',
    url: t.url || '',
    active: t.active,
    usage: t.id !== undefined ? usage[t.id] || 0 : 0,
    pinned: !!t.pinned,
    lastAccessed: (t as any).lastAccessed
  }));
  return { count, limit, overLimit, tabs: entries };
};

