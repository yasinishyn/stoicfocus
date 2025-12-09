// Content Script for StoicFocus Extension
import { safeStorageLocalSet } from './storageHelpers';
import { getInitialCollapseState, setCollapseState } from './blockButtonUtils';
import { getDoomAlertConfig } from './doomUtils';

interface AppSettings {
  enabled: boolean;
  showInjectedIcon: boolean;
  doomScrollLimit: number;
  monochromeMode: boolean;
  mementoMoriEnabled: boolean;
  frictionDurationMinutes: number;
  hardcoreMode: boolean;
  focusDuration: number;
  breakDuration: number;
  negativeVisualization: boolean;
  soundEffects: boolean;
  tabLimit: number;
  geminiApiKey: string;
}

interface BlockedSite {
  id: string;
  domain: string;
  type: 'domain' | 'category';
  category: string;
  listType: 'blacklist' | 'greylist' | 'whitelist';
}

interface CategoryDefinitions {
  [key: string]: string[];
}

interface TabSummary {
  count: number;
  limit: number;
  overLimit: boolean;
  tabs: Array<{ id: number; title: string; url: string; usage?: number }>;
}

interface HiddenStates {
  blockButton: Record<string, boolean>;
  tabManager: Record<string, boolean>;
  blockButtonCollapsed?: Record<string, boolean>;
}

// Check if extension context is valid
const isExtensionContextValid = (): boolean => {
  try {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
};

// Safe wrapper for chrome.storage operations
const safeStorageGet = async (keys: string | string[]): Promise<any> => {
  if (!isExtensionContextValid()) {
    return {};
  }
  try {
    return await chrome.storage.sync.get(keys);
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      // Extension was reloaded, return empty/default values
      return {};
    }
    throw e;
  }
};

const safeStorageLocalGet = async (keys: string | string[]): Promise<any> => {
  if (!isExtensionContextValid()) {
    return {};
  }
  try {
    return await chrome.storage.local.get(keys);
  } catch (e) {
    if ((e as any).message && (e as any).message.includes('Extension context invalidated')) {
      return {};
    }
    throw e;
  }
};

const safeStorageSet = async (items: any): Promise<void> => {
  if (!isExtensionContextValid()) {
    return;
  }
  try {
    await chrome.storage.sync.set(items);
  } catch (e) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      return;
    }
    throw e;
  }
};

const safeRuntimeGetURL = (path: string): string => {
  if (!isExtensionContextValid()) {
    return '';
  }
  try {
    return chrome.runtime.getURL(path);
  } catch (e) {
    return '';
  }
};

// Load settings
const loadSettings = async (): Promise<AppSettings> => {
  try {
    const result = await safeStorageGet('settings');
  return result.settings || {
    enabled: true,
    showInjectedIcon: true,
    doomScrollLimit: 3,
      monochromeMode: false,
      mementoMoriEnabled: false,
      frictionDurationMinutes: 10,
      hardcoreMode: false,
      focusDuration: 25,
      breakDuration: 5,
      negativeVisualization: true,
      soundEffects: true,
      tabLimit: 5,
      geminiApiKey: ''
    };
  } catch (e) {
    // Return defaults if error
    return {
      enabled: true,
      showInjectedIcon: true,
      doomScrollLimit: 3,
      monochromeMode: false,
      mementoMoriEnabled: false,
      frictionDurationMinutes: 10,
      hardcoreMode: false,
      focusDuration: 25,
      breakDuration: 5,
      negativeVisualization: true,
      soundEffects: true,
      tabLimit: 5,
      geminiApiKey: ''
    };
  }
};

const loadBlockedSites = async (): Promise<{ blockedSites: BlockedSite[]; categoryDefinitions: CategoryDefinitions }> => {
  try {
    const result = await safeStorageGet(['blockedSites', 'categoryDefinitions']);
    const rawSites: BlockedSite[] = result.blockedSites || [];
    const normalizedSites = rawSites.map((s: any) => {
      const lt = s.listType === 'blacklist' ? 'blocklist' : s.listType;
      return { ...s, listType: lt } as BlockedSite;
    });
  return {
      blockedSites: normalizedSites,
    categoryDefinitions: result.categoryDefinitions || {}
  };
  } catch (e) {
    return {
      blockedSites: [],
      categoryDefinitions: {}
    };
  }
};

// Create in-page blocker button
const createBlockButton = (): HTMLElement => {
  const button = document.createElement('div');
  button.id = 'stoicfocus-block-button';
  button.innerHTML = `
    <div class="stoicfocus-block-inner">
      <button class="stoicfocus-block-main">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
        <span style="white-space: nowrap;">BLOCK SITE</span>
    </button>
      <div class="stoicfocus-block-handle" title="Hide/Show block button">&#187;</div>
    </div>
  `;
  
  const btn = button.querySelector('button');
  const handle = button.querySelector('.stoicfocus-block-handle') as HTMLElement | null;
  let collapsed = getInitialCollapseState(currentHost, hiddenStates, blockButtonCollapsed);

  const setCollapsed = (state: boolean) => {
    collapsed = state;
    blockButtonCollapsed = state;
    hiddenStates = setCollapseState(currentHost, hiddenStates, state) as HiddenStates;
    saveHiddenStates({ blockButtonCollapsed: hiddenStates.blockButtonCollapsed });
    if (collapsed) {
      button.classList.add('stoicfocus-collapsed');
      if (handle) handle.innerHTML = '&#171;'; // <<
    } else {
      button.classList.remove('stoicfocus-collapsed');
      if (handle) handle.innerHTML = '&#187;'; // >>
    }
  };

  if (handle) {
    handle.addEventListener('click', (e) => {
      e.stopPropagation();
      setCollapsed(!collapsed);
    });
  }

  if (btn) {
    btn.addEventListener('click', blockCurrentPage);
        }

  // Initialize collapsed state for current domain
  setCollapsed(collapsed);
  
  return button;
};

const ensureBlockButton = (recreate = false) => {
  if (!isExtensionContextValid()) return;
  if (!settingsEnabled) return;
  if (isWhitelisted) {
    const existing = document.getElementById('stoicfocus-block-button');
    if (existing) existing.remove();
    return;
  }
  ensureFixedStyles();
  if (hiddenStates.blockButton[currentHost]) {
    ensureBlockButtonRestore();
    return;
  }
  const existing = document.getElementById('stoicfocus-block-button');
  if (existing && !recreate) return;
  if (existing && recreate) existing.remove();
  const btn = createBlockButton();
  document.body.appendChild(btn);
  ensureBlockButtonRestore();
};

let blockButtonRestore: HTMLDivElement | null = null;
  const ensureBlockButtonRestore = () => {
  if (!hiddenStates.blockButton[currentHost]) {
    if (blockButtonRestore) blockButtonRestore.remove();
    blockButtonRestore = null;
    return;
  }
  if (!blockButtonRestore) {
    blockButtonRestore = document.createElement('div');
    blockButtonRestore.id = 'stoicfocus-block-button-restore';
    blockButtonRestore.style.position = 'fixed';
    blockButtonRestore.style.bottom = '24px';
    blockButtonRestore.style.right = '24px';
    blockButtonRestore.style.zIndex = '2147483647';
    blockButtonRestore.style.background = '#dc2626';
    blockButtonRestore.style.color = '#fff';
    blockButtonRestore.style.padding = '10px 12px';
    blockButtonRestore.style.borderRadius = '6px';
    blockButtonRestore.style.fontFamily = '"Space Mono", monospace';
    blockButtonRestore.style.fontSize = '11px';
    blockButtonRestore.style.fontWeight = '700';
    blockButtonRestore.style.cursor = 'pointer';
    blockButtonRestore.style.boxShadow = '0 8px 16px rgba(0,0,0,0.22)';
    blockButtonRestore.textContent = 'Show BLOCK button';
    blockButtonRestore.addEventListener('click', async () => {
      hiddenStates.blockButton[currentHost] = false;
      await saveHiddenStates({ blockButton: hiddenStates.blockButton });
      ensureBlockButtonRestore();
      ensureBlockButton(true);
    });
    document.body.appendChild(blockButtonRestore);
  }
};

// Doom scroll detection
let scrollPages = 0;
let lastScrollTop = 0;
let scrollTimeout: number | null = null;

const handleScroll = async () => {
  const settings = await loadSettings();
  if (!settings.enabled) return;
  if (isWhitelisted) {
    const existingAlert = document.getElementById('stoicfocus-doom-alert');
    if (existingAlert) existingAlert.remove();
    return;
  }
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const clientHeight = window.innerHeight;
  const pagesScrolled = scrollTop / clientHeight;
  
  if (pagesScrolled > settings.doomScrollLimit) {
    // Show/update doom scroll alert
    const existingAlert = document.getElementById('stoicfocus-doom-alert');
    if (existingAlert) {
      const cfg = getDoomAlertConfig(doomDismissedOnce);
      const labelEl = existingAlert.querySelector('.stoicfocus-doom-label') as HTMLSpanElement | null;
      if (labelEl) {
        labelEl.textContent = cfg.label;
      }
      const whitelistEl = existingAlert.querySelector('.stoicfocus-doom-whitelist') as HTMLButtonElement | null;
      if (cfg.showWhitelist && !whitelistEl) {
        const wl = document.createElement('button');
        wl.className = 'stoicfocus-doom-whitelist';
        wl.textContent = 'Whitelist';
        wl.style.border = '1px solid #ffffff';
        wl.style.background = 'transparent';
        wl.style.color = '#ffffff';
        wl.style.fontWeight = '700';
        wl.style.fontSize = '10px';
        wl.style.padding = '4px 8px';
        wl.style.borderRadius = '0px';
        wl.style.cursor = 'pointer';
        wl.addEventListener('click', async (e) => {
          e.stopPropagation();
          await whitelistCurrentPage();
          existingAlert.remove();
          doomDismissedOnce = false;
        });
        existingAlert.insertBefore(wl, existingAlert.querySelector('.stoicfocus-doom-close'));
      }
      return;
    }
    const alert = document.createElement('div');
    alert.id = 'stoicfocus-doom-alert';
    alert.style.cssText = `
      position: fixed;
      top: 56px;
      right: 10px;
      z-index: 999998;
      background-color: #0f0f10;
      color: white;
      padding: 8px 10px;
      border-radius: 0px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      animation: pulse 2s infinite;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    `;

    const cfg = getDoomAlertConfig(doomDismissedOnce);
    const label = document.createElement('span');
    label.className = 'stoicfocus-doom-label';
    label.textContent = cfg.label;

    const blockActionBtn = document.createElement('button');
    blockActionBtn.textContent = 'Block site';
    blockActionBtn.style.border = '1px solid #dc2626';
    blockActionBtn.style.background = '#dc2626';
    blockActionBtn.style.color = '#fff';
    blockActionBtn.style.fontWeight = '700';
    blockActionBtn.style.fontSize = '10px';
    blockActionBtn.style.padding = '4px 8px';
    blockActionBtn.style.borderRadius = '0px';
    blockActionBtn.style.cursor = 'pointer';
    blockActionBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await blockCurrentPage();
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontWeight = '900';
    closeBtn.style.fontSize = '12px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      alert.remove();
      doomDismissedOnce = true;
    });

    alert.appendChild(label);
    alert.appendChild(blockActionBtn);
    if (cfg.showWhitelist) {
      const whitelistBtn = document.createElement('button');
      whitelistBtn.className = 'stoicfocus-doom-whitelist';
      whitelistBtn.textContent = 'Whitelist';
      whitelistBtn.style.border = '1px solid #ffffff';
      whitelistBtn.style.background = 'transparent';
      whitelistBtn.style.color = '#ffffff';
      whitelistBtn.style.fontWeight = '700';
      whitelistBtn.style.fontSize = '10px';
      whitelistBtn.style.padding = '4px 8px';
      whitelistBtn.style.borderRadius = '0px';
      whitelistBtn.style.cursor = 'pointer';
      whitelistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await whitelistCurrentPage();
        alert.remove();
        doomDismissedOnce = false;
      });
      alert.appendChild(whitelistBtn);
    }
    alert.appendChild(closeBtn);

    document.body.appendChild(alert);
    
    // Update block button to show alert state
    const blockButtonEl = document.getElementById('stoicfocus-block-button');
    if (blockButtonEl) {
      const btn = blockButtonEl.querySelector('button');
      if (btn) {
        btn.style.backgroundColor = '#dc2626';
        btn.style.animation = 'pulse 2s infinite';
      }
    }
    
    // stays until user closes
  }
};

// Check if current page is an extension page
const isExtensionPage = (): boolean => {
  return window.location.protocol === 'chrome-extension:' || 
         window.location.href.includes('chrome-extension://') ||
         window.location.href.includes('chrome://');
};

// Detect PDF pages (native viewer or embedded)
const isPdfPage = (): boolean => {
  const url = window.location.href.toLowerCase();
  if (document.contentType === 'application/pdf') return true;
  if (url.endsWith('.pdf')) return true;
  if (url.includes('/gview?') && url.includes('pdf')) return true; // Google Docs/Drive PDF viewer
  if (document.querySelector('embed[type="application/pdf"], object[type="application/pdf"]')) return true;
  return false;
};

const normalizeDomain = (d: string) => d.toLowerCase().replace(/^www\./, '');
const domainsMatch = (a: string, b: string) => {
  const da = normalizeDomain(a);
  const db = normalizeDomain(b);
  return da === db || da.endsWith(`.${db}`) || db.endsWith(`.${da}`);
};

let isWhitelisted = false;
let blockButtonCollapsed = false;
let tabSummaryState: TabSummary | null = null;
let tabAlertEl: HTMLDivElement | null = null;
let tabListExpanded = false;
const currentHost = window.location.hostname.replace(/^www\./, '').toLowerCase();
let hiddenStates: HiddenStates = { blockButton: {}, tabManager: {}, blockButtonCollapsed: {} };
let settingsEnabled = true;
let doomDismissedOnce = false;

const loadHiddenStates = async (): Promise<HiddenStates> => {
  try {
    const res = await safeStorageLocalGet('hiddenStates');
    hiddenStates = {
      blockButton: {},
      tabManager: {},
      blockButtonCollapsed: {},
      ...(res.hiddenStates || {})
    };
  } catch {
    hiddenStates = { blockButton: {}, tabManager: {}, blockButtonCollapsed: {} };
  }
  return hiddenStates;
};

const saveHiddenStates = async (patch: Partial<HiddenStates>) => {
  hiddenStates = { ...hiddenStates, ...patch };
  try {
    await safeStorageLocalSet({ hiddenStates });
  } catch {
    // ignore
  }
};

const blockCurrentPage = async () => {
  const currentUrl = window.location.href;
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated. Please reload the page.');
      return;
    }
    const url = new URL(currentUrl);
    const domain = url.hostname;
    applyMonochrome(true);
    const result = await safeStorageGet('blockedSites');
    const blockedSites = result.blockedSites || [];
    const alreadyBlocked = blockedSites.some((s: BlockedSite) => s.domain === domain && s.listType === 'blacklist');
    if (!alreadyBlocked) {
      const newSite = {
        id: Math.random().toString(36).substr(2, 9),
        domain: domain,
        type: 'domain' as const,
        category: 'custom',
        listType: 'blacklist' as const,
        redirectCount: 0
      };
      blockedSites.push(newSite);
      await safeStorageSet({ blockedSites });
      const blockedUrl = safeRuntimeGetURL(`blocked.html?url=${encodeURIComponent(currentUrl)}&mode=strict`);
      if (blockedUrl) {
        window.location.href = blockedUrl;
      } else {
        window.location.reload();
      }
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.error('Error blocking site:', e);
    }
  }
  doomDismissedOnce = false;
};

const whitelistCurrentPage = async () => {
  const currentUrl = window.location.href;
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated. Please reload the page.');
      return;
    }
    const url = new URL(currentUrl);
    const domain = url.hostname.replace(/^www\./, '');
    const result = await safeStorageGet('blockedSites');
    const blockedSites = result.blockedSites || [];
    const already = blockedSites.some((s: BlockedSite) => s.domain === domain && s.listType === 'whitelist');
    if (!already) {
      blockedSites.push({
        id: Math.random().toString(36).substr(2, 9),
        domain,
        type: 'domain' as const,
        category: 'custom',
        listType: 'whitelist' as const,
        redirectCount: 0
      });
      await safeStorageSet({ blockedSites });
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.error('Error whitelisting site:', e);
    }
  }
};


const computeListFlags = (
  blockedSites: BlockedSite[],
  categories: CategoryDefinitions,
  currentDomain: string
) => {
  const normalizeType = (lt: string) => lt === 'blacklist' ? 'blocklist' : lt;
  const matches = (site: BlockedSite) => {
    if (site.type === 'domain') return domainsMatch(currentDomain, site.domain);
    const domains = categories[site.category] || [];
    return domains.some(d => domainsMatch(currentDomain, d));
  };
  let inBlock = false, inGrey = false, inWhite = false;
  blockedSites.forEach((s: any) => {
    const lt = normalizeType(s.listType);
    if (!matches(s)) return;
    if (lt === 'blocklist') inBlock = true;
    else if (lt === 'greylist') inGrey = true;
    else if (lt === 'whitelist') inWhite = true;
  });
  return { inBlock, inGrey, inWhite };
};

const ensureTabAlert = (summary: TabSummary | null) => {
  tabSummaryState = summary;
  if (!summary || !summary.overLimit || hiddenStates.tabManager[currentHost]) {
    if (tabAlertEl) tabAlertEl.remove();
    tabAlertEl = null;
    ensureTabRestore();
    return;
  }

  if (!tabAlertEl) {
    tabAlertEl = document.createElement('div');
    tabAlertEl.id = 'stoicfocus-tab-alert';
    tabAlertEl.style.position = 'fixed';
    tabAlertEl.style.top = '10px';
    tabAlertEl.style.right = '10px';
    tabAlertEl.style.zIndex = '2147483647';
    tabAlertEl.style.background = '#dc2626';
    tabAlertEl.style.color = '#ffffff';
    tabAlertEl.style.padding = '8px 10px';
    tabAlertEl.style.borderRadius = '8px';
    tabAlertEl.style.fontFamily = '"Space Mono", monospace';
    tabAlertEl.style.fontSize = '11px';
    tabAlertEl.style.boxShadow = '0 12px 28px rgba(0,0,0,0.22)';
    tabAlertEl.style.mixBlendMode = 'normal';
    tabAlertEl.style.isolation = 'isolate';
    tabAlertEl.style.minWidth = '160px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';
    header.style.fontWeight = '700';
    header.textContent = 'Tabs';

    const count = document.createElement('span');
    count.id = 'stoicfocus-tab-count';
    count.style.fontWeight = '900';
    count.style.letterSpacing = '0.08em';
    header.appendChild(count);

    const headerActions = document.createElement('div');
    headerActions.style.display = 'flex';
    headerActions.style.alignItems = 'center';
    headerActions.style.gap = '6px';

    const toggle = document.createElement('button');
    toggle.textContent = 'Show';
    toggle.style.border = '1px solid #ffffff';
    toggle.style.background = 'transparent';
    toggle.style.color = '#ffffff';
    toggle.style.fontWeight = '700';
    toggle.style.fontSize = '10px';
    toggle.style.padding = '4px 8px';
    toggle.style.borderRadius = '6px';
    toggle.style.cursor = 'pointer';
    toggle.addEventListener('click', () => {
      tabListExpanded = !tabListExpanded;
      toggle.textContent = tabListExpanded ? 'Hide' : 'Show';
      const list = tabAlertEl?.querySelector<HTMLDivElement>('#stoicfocus-tab-list');
      if (list) list.style.display = tabListExpanded ? 'block' : 'none';
    });
    headerActions.appendChild(toggle);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.border = 'none';
    close.style.background = 'transparent';
    close.style.color = '#ffffff';
    close.style.fontWeight = '900';
    close.style.fontSize = '12px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', async () => {
      tabAlertEl?.remove();
      tabAlertEl = null;
      hiddenStates.tabManager[currentHost] = true;
      await saveHiddenStates({ tabManager: hiddenStates.tabManager });
      ensureTabRestore();
    });
    headerActions.appendChild(close);

    header.appendChild(headerActions);


    const list = document.createElement('div');
    list.id = 'stoicfocus-tab-list';
    list.style.display = 'none';
    list.style.marginTop = '6px';
    list.style.background = '#b91c1c';
    list.style.borderRadius = '6px';
    list.style.maxHeight = '180px';
    list.style.overflowY = 'auto';
    list.style.padding = '5px';
    list.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.12)';

    tabAlertEl.appendChild(header);
    tabAlertEl.appendChild(list);
    document.body.appendChild(tabAlertEl);
  }

  const countEl = tabAlertEl!.querySelector<HTMLSpanElement>('#stoicfocus-tab-count');
  if (countEl) {
    countEl.textContent = `${summary.count}/${summary.limit}`;
  }

  const listEl = tabAlertEl!.querySelector<HTMLDivElement>('#stoicfocus-tab-list');
  if (listEl) {
    listEl.innerHTML = '';
    summary.tabs.forEach((t) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '6px';
      row.style.padding = '3px 0';

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.flexDirection = 'column';
      info.style.flex = '1';
      info.style.minWidth = '0';

      const title = document.createElement('div');
      title.textContent = t.title || t.url;
      title.style.fontWeight = '700';
      title.style.fontSize = '10px';
      title.style.whiteSpace = 'nowrap';
      title.style.overflow = 'hidden';
      title.style.textOverflow = 'ellipsis';
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.textContent = `${t.url} • ${t.usage || 0}x`;
      meta.style.fontSize = '9px';
      meta.style.opacity = '0.85';
      meta.style.whiteSpace = 'nowrap';
      meta.style.overflow = 'hidden';
      meta.style.textOverflow = 'ellipsis';
      info.appendChild(meta);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.border = '1px solid #fff';
      closeBtn.style.background = '#991b1b';
      closeBtn.style.color = '#fff';
      closeBtn.style.fontWeight = '900';
      closeBtn.style.fontSize = '10px';
      closeBtn.style.width = '22px';
      closeBtn.style.height = '22px';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.addEventListener('click', () => {
        if (isExtensionContextValid()) {
          chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId: t.id });
        }
      });

      row.appendChild(info);
      row.appendChild(closeBtn);
      listEl.appendChild(row);
    });
    listEl.style.display = tabListExpanded ? 'block' : 'none';
  }
};

const initTabAlertWatcher = async () => {
  try {
    const local = await safeStorageLocalGet('tabSummary');
    ensureTabAlert(local.tabSummary || null);
  } catch {
    // ignore
  }

  if (isExtensionContextValid()) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.tabSummary) {
        ensureTabAlert(changes.tabSummary.newValue || null);
      }
    });
  }
};

// Inject fixed-position styles for StoicFocus UI to avoid filter/height side-effects
const ensureFixedStyles = () => {
  if (document.getElementById('stoicfocus-fixed-styles')) return;
  const style = document.createElement('style');
  style.id = 'stoicfocus-fixed-styles';
  style.textContent = `
    #stoicfocus-block-button {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      left: auto !important;
      top: auto !important;
      z-index: 2147483647 !important;
      transform: translateZ(0) !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
      background: transparent !important;
      display: inline-flex !important;
      align-items: center !important;
      transition: transform 0.2s ease, opacity 0.2s ease !important;
    }
    #stoicfocus-block-button.stoicfocus-collapsed {
      transform: translateX(calc(100% - 20px)) translateZ(0) !important;
      opacity: 1 !important;
    }
    #stoicfocus-block-button .stoicfocus-block-inner {
      display: inline-flex !important;
      align-items: stretch !important;
      position: relative !important;
      background: transparent !important;
      gap: 0 !important;
    }
    #stoicfocus-block-button .stoicfocus-block-main {
      position: relative !important;
      z-index: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      padding: 8px 10px !important;
      min-width: 120px !important;
      min-height: 38px !important;
      background-color: #dc2626 !important;
      color: #ffffff !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 0px 0 0 0px !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 6px 12px rgba(0,0,0,0.2) !important;
      transform: translateZ(0) !important;
      letter-spacing: 0.05em !important;
      line-height: 1 !important;
      filter: none !important;
      -webkit-filter: none !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
  }
    #stoicfocus-block-button .stoicfocus-block-main svg {
      flex-shrink: 0 !important;
    }
    #stoicfocus-block-button .stoicfocus-block-handle {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 26px !important;
      height: 38px !important;
      background: #dc2626 !important;
      color: #ffffff !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-left: none !important;
      border-radius: 0px !important;
      cursor: pointer !important;
      box-shadow: 0 6px 12px rgba(0,0,0,0.2) !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      user-select: none !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
      transform: translateZ(0) !important;
    }
    #stoicfocus-block-button.stoicfocus-collapsed .stoicfocus-block-main {
      display: none !important;
    }
    #stoicfocus-block-button.stoicfocus-collapsed .stoicfocus-block-handle {
      border-radius: 0px !important;
      border-left: 1px solid rgba(255,255,255,0.1) !important;
      transform: translateZ(0) !important;
    }
    #stoicfocus-doom-alert,
    #stoicfocus-monochrome-notification {
      position: fixed !important;
      top: 56px !important;
      right: 10px !important;
      left: auto !important;
      z-index: 2147483647 !important;
      transform: translateZ(0) !important;
      border-radius: 0px !important;
    }
  `;
  document.head.appendChild(style);
};

// Monochrome overlay layer (avoids filtering ancestors that break fixed positioning)
const ensureMonochromeLayer = (enabled: boolean) => {
  const existing = document.getElementById('stoicfocus-monochrome-layer');
  if (!enabled) {
    if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
    return;
  }
  if (existing) return;
  const layer = document.createElement('div');
  layer.id = 'stoicfocus-monochrome-layer';
  layer.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483000;
    backdrop-filter: grayscale(100%) !important;
    -webkit-backdrop-filter: grayscale(100%) !important;
    mix-blend-mode: normal;
  `;
  document.documentElement.appendChild(layer);
};

// Show monochrome notification
const showMonochromeNotification = () => {
  // Remove existing notification if any
  const existing = document.getElementById('stoicfocus-monochrome-notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'stoicfocus-monochrome-notification';
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 2147483647;
    background-color: #dc2626;
    color: white;
    padding: 8px 10px;
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    animation: pulse 2s infinite;
  `;
  notification.textContent = 'STOIC MONOCHROME MODE ACTIVATED';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#fff';
  closeBtn.style.fontWeight = '900';
  closeBtn.style.fontSize = '12px';
  closeBtn.style.marginLeft = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    notification.remove();
  });
  notification.appendChild(closeBtn);

  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
};

// Monochrome mode - applies grayscale to all pages when enabled (except extension pages)
let monochromeApplied = false;

const applyMonochrome = async (immediate = false) => {
  try {
    // Don't apply to extension pages or PDF views (to avoid black PDFs)
    if (isExtensionPage() || isPdfPage()) {
      return;
    }

    // Refresh whitelist status for current domain on each apply
    const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();
    const { blockedSites, categoryDefinitions } = await loadBlockedSites();
    const { inBlock, inGrey, inWhite } = computeListFlags(blockedSites, categoryDefinitions, currentDomain);
    isWhitelisted = inWhite && !inBlock && !inGrey;
    if (isWhitelisted) {
      // If previously applied, clean up overlay/filters for whitelisted domains
      monochromeApplied = false;
      ensureMonochromeLayer(false);
      document.body.classList.remove('stoicfocus-monochrome');
      document.body.style.removeProperty('filter');
      document.body.style.removeProperty('-webkit-filter');
      document.body.style.removeProperty('transition');
      document.documentElement.style.removeProperty('filter');
      document.documentElement.style.removeProperty('-webkit-filter');
      document.documentElement.style.removeProperty('transition');
      const notification = document.getElementById('stoicfocus-monochrome-notification');
      if (notification) notification.remove();
      return;
    }

  const settings = await loadSettings();
  
  if (settings.enabled && settings.monochromeMode) {
      ensureFixedStyles();

      // If already applied and not forced, keep
      if (monochromeApplied && !immediate) {
        return;
      }

      // Apply overlay layer instead of filtering ancestors
      ensureMonochromeLayer(true);
      // Clean any residual filters
      document.body.classList.remove('stoicfocus-monochrome');
      document.body.style.removeProperty('filter');
      document.body.style.removeProperty('-webkit-filter');
      document.body.style.removeProperty('transition');
      document.documentElement.style.removeProperty('filter');
      document.documentElement.style.removeProperty('-webkit-filter');
      document.documentElement.style.removeProperty('transition');
      
      monochromeApplied = true;
      
      // Apply to all iframes as well
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            if (!iframeDoc.body.classList.contains('stoicfocus-monochrome')) {
              iframeDoc.body.classList.add('stoicfocus-monochrome');
            }
            iframeDoc.body.style.setProperty('filter', 'grayscale(100%)', 'important');
            iframeDoc.body.style.setProperty('-webkit-filter', 'grayscale(100%)', 'important');
            iframeDoc.body.style.setProperty('transition', 'filter 0.3s ease-in-out, -webkit-filter 0.3s ease-in-out', 'important');
            iframeDoc.documentElement.style.removeProperty('filter');
            iframeDoc.documentElement.style.removeProperty('-webkit-filter');
            iframeDoc.documentElement.style.removeProperty('transition');
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      });

      // Show notification after a brief delay (0.5s) so it's visible post-apply
      setTimeout(() => showMonochromeNotification(), 500);
    } else {
      // Remove filter if disabled
      monochromeApplied = false;
      ensureMonochromeLayer(false);
      document.body.classList.remove('stoicfocus-monochrome');
      document.body.style.removeProperty('filter');
      document.body.style.removeProperty('-webkit-filter');
      document.body.style.removeProperty('transition');
      document.documentElement.style.removeProperty('filter');
      document.documentElement.style.removeProperty('-webkit-filter');
      document.documentElement.style.removeProperty('transition');
      document.body.style.removeProperty('filter');
      document.body.style.removeProperty('-webkit-filter');
      document.body.style.removeProperty('transition');
      
      // Remove notification if present
      const notification = document.getElementById('stoicfocus-monochrome-notification');
      if (notification) {
        notification.remove();
      }
      
      // Remove from iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.body.classList.remove('stoicfocus-monochrome');
            iframeDoc.body.style.removeProperty('filter');
            iframeDoc.body.style.removeProperty('-webkit-filter');
            iframeDoc.body.style.removeProperty('transition');
            iframeDoc.documentElement.style.removeProperty('filter');
            iframeDoc.documentElement.style.removeProperty('-webkit-filter');
            iframeDoc.documentElement.style.removeProperty('transition');
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      });
    }
  } catch (e) {
    // Silently fail if extension context is invalidated
    if (e.message && !e.message.includes('Extension context invalidated')) {
      console.error('Error applying monochrome:', e);
    }
  }
};

// Initialize content script
const ensureTabRestore = () => {
  if (!hiddenStates.tabManager[currentHost]) {
    const existing = document.getElementById('stoicfocus-tab-restore');
    if (existing) existing.remove();
    return;
  }
  let pill = document.getElementById('stoicfocus-tab-restore') as HTMLDivElement | null;
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'stoicfocus-tab-restore';
    pill.style.position = 'fixed';
    pill.style.top = '10px';
    pill.style.right = '10px';
    pill.style.zIndex = '2147483647';
    pill.style.background = '#dc2626';
    pill.style.color = '#fff';
    pill.style.padding = '6px 8px';
    pill.style.borderRadius = '6px';
    pill.style.fontFamily = '"Space Mono", monospace';
    pill.style.fontSize = '10px';
    pill.style.fontWeight = '700';
    pill.style.cursor = 'pointer';
    pill.style.boxShadow = '0 6px 12px rgba(0,0,0,0.18)';
    pill.textContent = 'Show Tabs';
    pill.addEventListener('click', async () => {
      hiddenStates.tabManager[currentHost] = false;
      await saveHiddenStates({ tabManager: hiddenStates.tabManager });
      ensureTabRestore();
      ensureTabAlert(tabSummaryState);
    });
    document.body.appendChild(pill);
  }
};

const init = async () => {
  doomDismissedOnce = false;
  await loadHiddenStates();
  ensureFixedStyles();
  const settings = await loadSettings();
  // refresh whitelist on init
  try {
    const { blockedSites, categoryDefinitions } = await loadBlockedSites();
    const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();
    const { inBlock, inGrey, inWhite } = computeListFlags(blockedSites, categoryDefinitions, currentDomain);
    isWhitelisted = inWhite && !inBlock && !inGrey;
    if (isWhitelisted) {
      const existingAlert = document.getElementById('stoicfocus-doom-alert');
      if (existingAlert) existingAlert.remove();
    }
  } catch {}
  
  if (!settings.enabled) return;
  
  // Add block button if enabled
  if (settings.showInjectedIcon) {
    ensureBlockButton();
    // fast re-check in case first render was blocked
    setTimeout(() => ensureBlockButton(true), 400);
    setTimeout(() => ensureBlockButton(true), 1500);
  }
  
  // Setup doom scroll detection
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = window.setTimeout(handleScroll, 100);
  }, { passive: true });
  
  // Apply monochrome mode
  applyMonochrome(false);

  // Show tab warning if over limit (memento mori)
  initTabAlertWatcher();
  
  // Check for greylist and show typing tax if needed
  const { blockedSites, categoryDefinitions } = await loadBlockedSites();
  const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();
  const { inBlock, inGrey, inWhite } = computeListFlags(blockedSites, categoryDefinitions, currentDomain);
  isWhitelisted = inWhite && !inBlock && !inGrey;
  
  if (inGrey && !inBlock && !isWhitelisted) {
    try {
    // Check if temporarily unlocked
      const unlocked = await safeStorageLocalGet('tempUnlocked');
      const now = Date.now();
      let tempUnlocked = unlocked.tempUnlocked || [];
      if (Array.isArray(tempUnlocked)) {
        // support legacy array of strings
        if (tempUnlocked.length > 0 && typeof tempUnlocked[0] === 'string') {
          tempUnlocked = tempUnlocked.map((d: string) => ({ domain: d, expiresAt: 0 }));
        }
      } else {
        tempUnlocked = [];
      }
      const filtered = tempUnlocked.filter((entry: any) => entry && entry.expiresAt > now);
      if (filtered.length !== tempUnlocked.length) {
        await safeStorageLocalSet({ tempUnlocked: filtered });
      }

      const found = filtered.some((entry: any) => domainsMatch(entry.domain, currentDomain));
      if (!found) {
      // Redirect to typing tax page
        const blockedUrl = safeRuntimeGetURL(`blocked.html?url=${encodeURIComponent(window.location.href)}&mode=friction`);
        if (blockedUrl) {
      window.location.href = blockedUrl;
        }
      }
    } catch (e) {
      // Silently fail if extension context is invalidated
      if (e.message && !e.message.includes('Extension context invalidated')) {
        console.error('Error checking greylist:', e);
      }
    }
  }
};

// Listen for settings changes
if (isExtensionContextValid()) {
  try {
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_CHANGED') {
    // Apply new settings without reload
        monochromeApplied = false;
        ensureBlockButton();
        applyMonochrome(false);
      }
    });
  } catch (e) {
    // Extension context invalidated, ignore
    }
  }

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Ensure UI and monochrome when tab becomes active
const ensureUI = async (forceRecreateButton = false) => {
  try {
    const settings = await loadSettings();
    settingsEnabled = !!settings.enabled;
    if (settings.enabled && settings.showInjectedIcon) {
      ensureBlockButton(forceRecreateButton);
    } else {
      const existing = document.getElementById('stoicfocus-block-button');
      if (existing) existing.remove();
    }
  } catch (e) {
    // ignore
  }
};

// Apply on tab focus/visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    monochromeApplied = false;
    ensureUI();
    applyMonochrome(false);
  }
});

window.addEventListener('focus', () => {
  monochromeApplied = false;
  ensureUI();
  applyMonochrome(false);
});

// Re-apply monochrome when pomo state or settings change
if (isExtensionContextValid()) {
  try {
chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.settings) {
          settingsEnabled = !!(changes.settings.newValue?.enabled ?? settingsEnabled);
          monochromeApplied = false;
          applyMonochrome(false);
          ensureUI(true);
  }
        if (changes.blockedSites || changes.categoryDefinitions) {
          monochromeApplied = false;
          applyMonochrome(false);
        }
  }
});
  } catch (e) {
    // Extension context invalidated, ignore
  }
}

// Also check periodically in case of timing issues
// Only run if extension context is valid
setInterval(() => {
  if (isExtensionContextValid() && !isExtensionPage()) {
    applyMonochrome(false);
  }
}, 5000); // Check every 5 seconds

