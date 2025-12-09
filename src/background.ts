// Background Service Worker for StoicFocus Extension

import { TabSummary } from './types';
import { computeTabSummary } from './tabUtils';

interface BlockedSite {
  id: string;
  domain: string;
  type: 'domain' | 'category';
  category: string;
  listType: 'blocklist' | 'greylist' | 'whitelist';
  redirectCount: number;
}

interface AppSettings {
  enabled: boolean;
  hardcoreMode: boolean;
  showInjectedIcon: boolean;
  soundEffects: boolean;
  monochromeMode: boolean;
  mementoMoriEnabled: boolean;
  tabLimit: number;
  doomScrollLimit: number;
  geminiApiKey: string;
  focusDuration: number;
  breakDuration: number;
  negativeVisualization: boolean;
}

interface CategoryDefinitions {
  [key: string]: string[];
}

// Initialize default settings
const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  hardcoreMode: false,
  showInjectedIcon: true,
  soundEffects: true,
  monochromeMode: false,
  mementoMoriEnabled: false,
  tabLimit: 5,
  doomScrollLimit: 3,
  geminiApiKey: '',
  focusDuration: 25,
  breakDuration: 5,
  negativeVisualization: true,
  frictionDurationMinutes: 10
};

const DEFAULT_CATEGORIES: CategoryDefinitions = {
  social: ['x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'reddit.com', 'threads.net', 'pinterest.com', 'snapchat.com'],
  news: ['cnn.com', 'nytimes.com', 'bbc.com', 'reuters.com', 'theguardian.com'],
  shopping: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com'],
  entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'spotify.com'],
  custom: []
};

const TAB_USAGE_KEY = 'tabUsageCounts';

// Helper to extract domain from URL
const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const getTabUsageCounts = async (): Promise<Record<number, number>> => {
  const result = await chrome.storage.local.get(TAB_USAGE_KEY);
  return result[TAB_USAGE_KEY] || {};
};

const incrementTabUsage = async (tabId: number) => {
  if (!tabId && tabId !== 0) return;
  const usage = await getTabUsageCounts();
  usage[tabId] = (usage[tabId] || 0) + 1;
  await chrome.storage.local.set({ [TAB_USAGE_KEY]: usage });
};

const removeTabUsage = async (tabId: number) => {
  const usage = await getTabUsageCounts();
  if (usage[tabId] !== undefined) {
    delete usage[tabId];
    await chrome.storage.local.set({ [TAB_USAGE_KEY]: usage });
  }
};

// Check if URL matches blocked site
const isBlocked = (url: string, blockedSites: BlockedSite[], categoryDefinitions: CategoryDefinitions): { blocked: boolean; listType: 'blocklist' | 'greylist' | 'whitelist' | null; matchedDomain?: string } => {
  const domain = getDomain(url).toLowerCase();
  const matches = (checker: string) => {
    try {
      const c = checker.toLowerCase();
      const d = domain;
      return d === c || d.endsWith(`.${c}`) || c.endsWith(`.${d}`);
    } catch {
      return false;
    }
  };

  let inBlock = false;
  let inGrey = false;
  let inWhite = false;
  let matchedDomain: string | undefined;
  
  for (const site of blockedSites) {
    const listType = (site as any).listType === 'blacklist' ? 'blocklist' : site.listType;
    const matched = (() => {
    if (site.type === 'domain') {
        if (matches(site.domain)) {
          matchedDomain = site.domain;
          return true;
      }
        return false;
      }
      const domains = categoryDefinitions[site.category] || [];
      const hit = domains.find(d => matches(d));
      if (hit) matchedDomain = hit;
      return !!hit;
    })();

    if (!matched) continue;
    if (listType === 'blocklist') inBlock = true;
    else if (listType === 'greylist') inGrey = true;
    else if (listType === 'whitelist') inWhite = true;
  }

  if (inBlock) return { blocked: true, listType: 'blocklist', matchedDomain };
  if (inGrey) return { blocked: true, listType: 'greylist', matchedDomain };
  if (inWhite) return { blocked: false, listType: 'whitelist', matchedDomain };
  return { blocked: false, listType: null, matchedDomain };
};

// Handle tab updates - check for blocked sites
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  const result = await chrome.storage.sync.get(['settings', 'blockedSites', 'categoryDefinitions']);
  const settings: AppSettings = result.settings || DEFAULT_SETTINGS;
  const blockedSites: BlockedSite[] = (result.blockedSites || []).map((s: any) => ({
    ...s,
    listType: (s.listType === 'blacklist' ? 'blocklist' : s.listType) as any
  }));
  const categoryDefinitions: CategoryDefinitions = result.categoryDefinitions || DEFAULT_CATEGORIES;
  
  if (!settings.enabled) return;
  
  // Skip chrome:// and extension pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  
  const { blocked, listType, matchedDomain } = isBlocked(tab.url, blockedSites, categoryDefinitions);
  
  if (listType === 'whitelist') return;

  if (blocked && listType === 'blocklist') {
    // Redirect to blocked page
    const blockedUrl = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(tab.url)}&mode=strict`);
    chrome.tabs.update(tabId, { url: blockedUrl });
    
    // Increment redirect count
    const site = blockedSites.find(s => {
      const domain = getDomain(tab.url!);
      if (s.type === 'domain') {
        return domain.includes(s.domain.toLowerCase());
      } else {
        const domains = categoryDefinitions[s.category] || [];
        return domains.some(d => domain.includes(d.toLowerCase()));
      }
    });
    if (site) {
      site.redirectCount = (site.redirectCount || 0) + 1;
      await chrome.storage.sync.set({ blockedSites });
    }
    if (matchedDomain) {
      await incrementDomainRedirectCount(matchedDomain.toLowerCase());
    }
      
      // Update intervention metric
      const metricsResult = await chrome.storage.local.get('metrics');
      const currentMetrics = metricsResult.metrics || { interventions: 0, focusScore: 0, tabsWithered: 0, frictionOvercome: 0 };
      const updatedMetrics = {
        ...currentMetrics,
        interventions: (currentMetrics.interventions || 0) + 1
      };
      await chrome.storage.local.set({ metrics: updatedMetrics });
  } else if (blocked && listType === 'greylist') {
    // For greylist, inject content script to show typing tax
    // This is handled by content script checking storage
  }
});

// Tab summary tracking (Memento Mori warnings instead of auto-close)
const refreshTabSummary = async () => {
  const settingsResult = await chrome.storage.sync.get('settings');
  const settings: AppSettings = settingsResult.settings || DEFAULT_SETTINGS;
  const enabled = settings.enabled && settings.mementoMoriEnabled;

  const tabs = await chrome.tabs.query({});
  const usage = await getTabUsageCounts();
  const summary = computeTabSummary(
    tabs,
    { enabled, mementoMoriEnabled: settings.mementoMoriEnabled, tabLimit: settings.tabLimit || DEFAULT_SETTINGS.tabLimit },
    usage
  );
  await chrome.storage.local.set({ tabSummary: summary });
};

chrome.tabs.onCreated.addListener(() => refreshTabSummary().catch(() => {}));
chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabUsage(tabId).catch(() => {});
  refreshTabSummary().catch(() => {});
});
chrome.tabs.onUpdated.addListener(() => refreshTabSummary().catch(() => {}));
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await incrementTabUsage(activeInfo.tabId);
  await refreshTabSummary().catch(() => {});
});

// Refresh tab summary when settings change (e.g., tabLimit updates)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.settings) {
    refreshTabSummary().catch(() => {});
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // Settings updated, sync to all tabs if needed
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED', settings: message.settings }).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        }
      });
    });
  }
  
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings').then(result => {
      sendResponse({ settings: result.settings || DEFAULT_SETTINGS });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_BLOCKED_SITES') {
    chrome.storage.sync.get(['blockedSites', 'categoryDefinitions']).then(result => {
      sendResponse({
        blockedSites: result.blockedSites || [],
        categoryDefinitions: result.categoryDefinitions || DEFAULT_CATEGORIES
      });
    });
    return true;
  }

  if (message.type === 'GET_TAB_SUMMARY') {
    chrome.storage.local.get('tabSummary').then(result => {
      sendResponse({ tabSummary: result.tabSummary as TabSummary | undefined });
    });
    return true;
  }

  if (message.type === 'CLOSE_TAB' && typeof message.tabId === 'number') {
    chrome.tabs.remove(message.tabId).catch(() => {});
  }
});

// Time tracking variables
let focusSessionStartTime: number | null = null;
let lastTrackedSecond: number = 0;
let notifiedFocusEnding = false;
let notifiedBreakEnding = false;
let lastFocusTimeLeftStart = 0;

// Track focus time and store daily data
const trackFocusTime = async (seconds: number) => {
  const hours = seconds / 3600;
  if (hours <= 0) return;
  
  // Use local date to avoid timezone offset shifting into the next day
  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStr = localDate.toISOString().split('T')[0]; // YYYY-MM-DD in local day
  const result = await chrome.storage.local.get('dailyTimeData');
  const dailyTimeData: Record<string, number> = result.dailyTimeData || {};
  
  dailyTimeData[dateStr] = (dailyTimeData[dateStr] || 0) + hours;
  await chrome.storage.local.set({ dailyTimeData });
};

// Pomodoro timer update (runs every second when active)
let pomoTimerInterval: number | null = null;

const startPomoTimer = async () => {
  if (pomoTimerInterval) return; // Already running
  
  pomoTimerInterval = setInterval(async () => {
    const result = await chrome.storage.local.get('pomo');
    const pomo = result.pomo;
    
    if (pomo && pomo.isActive) {
      // Ensure timeLeft is initialized based on settings
      if (!pomo.timeLeft || pomo.timeLeft <= 0) {
        const settingsResult = await chrome.storage.sync.get('settings');
        const settings: AppSettings = settingsResult.settings || DEFAULT_SETTINGS;
        const duration = (pomo.mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60;
        await chrome.storage.local.set({ pomo: { ...pomo, timeLeft: duration } });
        return;
      }

      // Countdown tick
      if (pomo.timeLeft > 0) {
      const newTimeLeft = pomo.timeLeft - 1;

        // 10-second heads up notifications
        if (newTimeLeft === 10) {
          try {
            if (pomo.mode === 'focus' && !notifiedFocusEnding) {
              notifiedFocusEnding = true;
              chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icon48.png'),
                title: 'StoicFocus',
                message: 'Rest begins in 10 seconds.'
              }).catch(() => {});
            }
            if (pomo.mode === 'break' && !notifiedBreakEnding) {
              notifiedBreakEnding = true;
              chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icon48.png'),
                title: 'StoicFocus',
                message: 'Rest ends in 10 seconds.'
              }).catch(() => {});
            }
          } catch {}
        }

      await chrome.storage.local.set({ 
        pomo: { ...pomo, timeLeft: newTimeLeft } 
      });
      
      // Timer finished
      if (newTimeLeft === 0) {
        const settingsResult = await chrome.storage.sync.get('settings');
        const settings: AppSettings = settingsResult.settings || DEFAULT_SETTINGS;
        const nextMode = pomo.mode === 'focus' ? 'break' : 'focus';
        const nextDuration = nextMode === 'focus' ? settings.focusDuration * 60 : settings.breakDuration * 60;
        
          // Reset notifications for next cycle
          notifiedFocusEnding = false;
          notifiedBreakEnding = false;

          // Auto-start next session (focus or break)
          const nextActive = true;
        await chrome.storage.local.set({
            pomo: { isActive: nextActive, mode: nextMode, timeLeft: nextDuration, preMortemCaptured: nextMode === 'focus' ? false : (pomo.preMortemCaptured ?? false) }
        });
          if (pomo.mode === 'focus' && focusSessionStartTime) {
            const sessionDuration = (Date.now() - focusSessionStartTime) / 1000;
            await trackFocusTime(sessionDuration);
            focusSessionStartTime = null;
            lastTrackedSecond = 0;
          }
          await notifySession(nextMode);
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon48.png'),
          title: 'StoicFocus Timer',
          message: `Timer complete. Switching to ${nextMode === 'focus' ? 'Deep Work' : 'Rest Phase'}.`
        }).catch(() => {
          // Ignore if notifications not available
        });
        }
      }
    } else if (pomo && !pomo.isActive) {
      // Stop timer if not active
      if (pomoTimerInterval) {
        clearInterval(pomoTimerInterval);
        pomoTimerInterval = null;
      }
    }
  }, 1000);
};

// Listen for pomo state changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.pomo) {
    const newPomo = changes.pomo.newValue;
    const oldPomo = changes.pomo.oldValue;
    
    // Session started
    if (newPomo && newPomo.isActive && newPomo.mode === 'focus' && (!oldPomo || !oldPomo.isActive)) {
      focusSessionStartTime = Date.now();
      lastTrackedSecond = newPomo.timeLeft;
      lastFocusTimeLeftStart = newPomo.timeLeft || lastFocusTimeLeftStart;
      startPomoTimer();
      await notifySession('focus');
    }
    // Focus -> break (still active): track focus time then continue
    else if (oldPomo && oldPomo.isActive && oldPomo.mode === 'focus' && newPomo && newPomo.isActive && newPomo.mode === 'break') {
      if (focusSessionStartTime) {
        const sessionDuration = (Date.now() - focusSessionStartTime) / 1000;
        await trackFocusTime(sessionDuration);
        focusSessionStartTime = null;
        lastTrackedSecond = 0;
        lastFocusTimeLeftStart = 0;
      }
      startPomoTimer();
      await notifySession('break');
    }
    // Break -> focus (auto start)
    else if (oldPomo && oldPomo.isActive && oldPomo.mode === 'break' && newPomo && newPomo.isActive && newPomo.mode === 'focus') {
      focusSessionStartTime = Date.now();
      lastTrackedSecond = newPomo.timeLeft;
      lastFocusTimeLeftStart = newPomo.timeLeft || lastFocusTimeLeftStart;
      startPomoTimer();
      await notifySession('focus');
    }
    // Session paused or stopped
    else if (oldPomo && oldPomo.isActive && oldPomo.mode === 'focus' && (!newPomo || !newPomo.isActive)) {
      if (focusSessionStartTime || lastFocusTimeLeftStart) {
        const elapsedFromTime = focusSessionStartTime ? (Date.now() - focusSessionStartTime) / 1000 : 0;
        const elapsedFromTimer = oldPomo.timeLeft !== undefined ? (lastFocusTimeLeftStart - oldPomo.timeLeft) : 0;
        const sessionDuration = Math.max(elapsedFromTime, elapsedFromTimer);
        if (sessionDuration > 0) {
          await trackFocusTime(sessionDuration);
        }
        focusSessionStartTime = null;
        lastTrackedSecond = 0;
        lastFocusTimeLeftStart = 0;
      }
      if (pomoTimerInterval) {
        clearInterval(pomoTimerInterval);
        pomoTimerInterval = null;
      }
    }
    // Session resumed
    else if (newPomo && newPomo.isActive && (!oldPomo || !oldPomo.isActive)) {
      startPomoTimer();
      if (newPomo.mode === 'focus' && !focusSessionStartTime) {
        focusSessionStartTime = Date.now();
      }
    }
  }
});

// Helper to increment per-domain redirect counts
const incrementDomainRedirectCount = async (domain: string) => {
  const res = await chrome.storage.local.get('domainRedirectCounts');
  const counts: Record<string, number> = res.domainRedirectCounts || {};
  counts[domain] = (counts[domain] || 0) + 1;
  await chrome.storage.local.set({ domainRedirectCounts: counts });
};

const notifySession = async (mode: 'focus' | 'break') => {
  try {
    const title = mode === 'focus' ? 'Deep Work Started' : 'Rest Started';
    const message = mode === 'focus'
      ? 'Focus now. Distractions are blocked.'
      : 'Take a short break. Recharge and come back strong.';
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon48.png'),
      title,
      message,
      silent: false
    });
  } catch {
    // ignore notification errors
  }
};

// Helper to block a domain
const blockDomain = async (domain: string) => {
  const result = await chrome.storage.sync.get('blockedSites');
  const blockedSites: BlockedSite[] = result.blockedSites || [];
  
  // Check if already blocked
  const alreadyBlocked = blockedSites.some(s => 
    s.domain.toLowerCase() === domain.toLowerCase() && s.listType === 'blacklist'
  );
  
  if (!alreadyBlocked) {
    const newSite: BlockedSite = {
      id: Math.random().toString(36).substr(2, 9),
      domain: domain,
      type: 'domain',
      category: 'custom',
      listType: 'blacklist',
      redirectCount: 0
    };
    blockedSites.push(newSite);
    await chrome.storage.sync.set({ blockedSites });
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon48.png'),
      title: 'StoicFocus',
      message: `${domain} has been added to blacklist.`
    }).catch(() => {
      // Ignore if notifications not available
    });
    
    return true;
  }
  return false;
};

const NOTIFICATION_PERMISSION_FLAG = 'notificationPermissionShown';

// Request notification permission on install/startup (only once)
const requestNotificationPermission = async () => {
  try {
    const flag = await chrome.storage.local.get(NOTIFICATION_PERMISSION_FLAG);
    if (flag[NOTIFICATION_PERMISSION_FLAG]) return;

    const permission = await chrome.notifications.getPermissionLevel();
    if (permission === 'denied') {
      // Permission was denied, we can't request again
      return;
    }
    // Try to create a test notification to trigger permission request
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon48.png'),
        title: 'StoicFocus',
        message: 'Notifications enabled for focus tracking and tab management.'
      });
      await chrome.storage.local.set({ [NOTIFICATION_PERMISSION_FLAG]: true });
    } catch (e) {
      // Permission not granted yet, will be requested on first actual notification
    }
  } catch (e) {
    // Ignore errors
  }
};

// Set action icon to black square (using existing icon files which are already black squares)
const setActionIcon = async () => {
  try {
    chrome.action.setIcon({
      path: {
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png'
      }
    });
    chrome.action.setTitle({ title: 'StoicFocus – Block this site' });
  } catch (e) {
    // Ignore errors
  }
};

const refreshActionIcon = async (tabId?: number) => {
  try {
    await setActionIcon();
    if (tabId !== undefined) {
      await chrome.action.enable(tabId);
      await chrome.action.setTitle({ tabId, title: 'StoicFocus – Block this site' });
    }
  } catch (e) {
    // Ignore errors (context might be invalid)
  }
};

// Context menu for quick block
chrome.runtime.onInstalled.addListener(async () => {
  // Set action icon
  await refreshActionIcon();
  
  // Request notification permission
  await requestNotificationPermission();
  
  // Create context menu item
  chrome.contextMenus.create({
    id: 'block-site',
    title: 'Block this site (StoicFocus)',
    contexts: ['page', 'frame', 'link']
  });
  
  const result = await chrome.storage.sync.get('settings');
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
  
  const catResult = await chrome.storage.sync.get('categoryDefinitions');
  if (!catResult.categoryDefinitions) {
    await chrome.storage.sync.set({ categoryDefinitions: DEFAULT_CATEGORIES });
  }
  
  await chrome.storage.local.set({ [TAB_USAGE_KEY]: {} });
  await refreshTabSummary().catch(() => {});
  
  // Start pomo timer if active
  const pomoResult = await chrome.storage.local.get('pomo');
  if (pomoResult.pomo && pomoResult.pomo.isActive) {
    startPomoTimer();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'block-site' && tab && tab.url) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname.replace('www.', '');
      const blocked = await blockDomain(domain);
      if (blocked && tab.id) {
        // Reload tab to trigger block
        chrome.tabs.reload(tab.id);
      }
    } catch (e) {
      console.error('Error blocking site from context menu:', e);
    }
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'block-current-site') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.id) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        const blocked = await blockDomain(domain);
        if (blocked) {
          // Reload tab to trigger block
          chrome.tabs.reload(tab.id);
        }
      } catch (e) {
        console.error('Error blocking site from keyboard shortcut:', e);
      }
    }
  }
});

// Start timer on startup if pomo is active
chrome.runtime.onStartup.addListener(async () => {
  await requestNotificationPermission();
  await refreshActionIcon();
  await refreshTabSummary().catch(() => {});
  const pomoResult = await chrome.storage.local.get('pomo');
  if (pomoResult.pomo && pomoResult.pomo.isActive) {
    startPomoTimer();
  }
});

// Request notification permission when extension starts
requestNotificationPermission();
setActionIcon();

// Also set icon whenever service worker starts
setActionIcon();

// Keep action icon enabled/visible on tab updates/activation
chrome.tabs.onUpdated.addListener((tabId) => {
  refreshActionIcon(tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  refreshActionIcon(activeInfo.tabId);
});

