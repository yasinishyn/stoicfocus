// Background Service Worker for StoicFocus Extension

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
  monochromeMode: true,
  mementoMoriEnabled: false,
  tabLimit: 5,
  doomScrollLimit: 3,
  geminiApiKey: '',
  focusDuration: 25,
  breakDuration: 5,
  negativeVisualization: true
};

const DEFAULT_CATEGORIES: CategoryDefinitions = {
  social: ['x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'reddit.com', 'threads.net', 'pinterest.com', 'snapchat.com'],
  news: ['cnn.com', 'nytimes.com', 'bbc.com', 'reuters.com', 'theguardian.com'],
  shopping: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com'],
  entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'spotify.com'],
  custom: []
};

// Helper to extract domain from URL
const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

// Check if URL matches blocked site
const isBlocked = (url: string, blockedSites: BlockedSite[], categoryDefinitions: CategoryDefinitions): { blocked: boolean; listType: 'blocklist' | 'greylist' | 'whitelist' | null } => {
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

  for (const site of blockedSites) {
    const listType = (site as any).listType === 'blacklist' ? 'blocklist' : site.listType;
    const matched = (() => {
      if (site.type === 'domain') return matches(site.domain);
      const domains = categoryDefinitions[site.category] || [];
      return domains.some(d => matches(d));
    })();

    if (!matched) continue;
    if (listType === 'blocklist') inBlock = true;
    else if (listType === 'greylist') inGrey = true;
    else if (listType === 'whitelist') inWhite = true;
  }

  if (inBlock) return { blocked: true, listType: 'blocklist' };
  if (inGrey) return { blocked: true, listType: 'greylist' };
  if (inWhite) return { blocked: false, listType: 'whitelist' };
  return { blocked: false, listType: null };
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
  
  const { blocked, listType } = isBlocked(tab.url, blockedSites, categoryDefinitions);
  
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
  } else if (blocked && listType === 'greylist') {
    // For greylist, inject content script to show typing tax
    // This is handled by content script checking storage
  }
});

// Memento Mori - Tab limit management (prevents new tabs when limit is reached)
chrome.tabs.onCreated.addListener(async (tab) => {
  const result = await chrome.storage.sync.get(['settings']);
  const settings: AppSettings = result.settings || DEFAULT_SETTINGS;
  
  if (!settings.mementoMoriEnabled || !settings.enabled) return;
  
  // Wait a moment for the tab to be fully created
  setTimeout(async () => {
    const tabs = await chrome.tabs.query({});
    const unpinnedTabs = tabs.filter(t => !t.pinned);
    
    // If limit exceeded, show explanation screen instead of closing
    if (unpinnedTabs.length > settings.tabLimit && tab.id && tab.url) {
      // Redirect to memento-mori explanation page
      const mementoUrl = chrome.runtime.getURL(`blocked.html?mode=memento&limit=${settings.tabLimit}`);
      await chrome.tabs.update(tab.id, { url: mementoUrl });
      
      // Update metrics
      const metrics = await chrome.storage.local.get('metrics');
      const currentMetrics = metrics.metrics || { tabsWithered: 0 };
      currentMetrics.tabsWithered = (currentMetrics.tabsWithered || 0) + 1;
      await chrome.storage.local.set({ metrics: currentMetrics });
    }
  }, 100);
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
});

// Time tracking variables
let focusSessionStartTime: number | null = null;
let lastTrackedSecond: number = 0;

// Track focus time and store daily data
const trackFocusTime = async (seconds: number) => {
  const hours = seconds / 3600;
  if (hours <= 0) return;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const result = await chrome.storage.local.get('dailyTimeData');
  const dailyTimeData: Record<string, number> = result.dailyTimeData || {};
  
  dailyTimeData[today] = (dailyTimeData[today] || 0) + hours;
  await chrome.storage.local.set({ dailyTimeData });
};

// Pomodoro timer update (runs every second when active)
let pomoTimerInterval: number | null = null;

const startPomoTimer = async () => {
  if (pomoTimerInterval) return; // Already running
  
  pomoTimerInterval = window.setInterval(async () => {
    const result = await chrome.storage.local.get('pomo');
    const pomo = result.pomo;
    
    if (pomo && pomo.isActive && pomo.timeLeft > 0) {
      const newTimeLeft = pomo.timeLeft - 1;
      await chrome.storage.local.set({ 
        pomo: { ...pomo, timeLeft: newTimeLeft } 
      });
      
      // Timer finished
      if (newTimeLeft === 0) {
        const settingsResult = await chrome.storage.sync.get('settings');
        const settings: AppSettings = settingsResult.settings || DEFAULT_SETTINGS;
        const nextMode = pomo.mode === 'focus' ? 'break' : 'focus';
        const nextDuration = nextMode === 'focus' ? settings.focusDuration * 60 : settings.breakDuration * 60;
        
        await chrome.storage.local.set({
          pomo: { isActive: false, mode: nextMode, timeLeft: nextDuration }
        });
        
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
      startPomoTimer();
    }
    // Session paused or stopped
    else if (oldPomo && oldPomo.isActive && oldPomo.mode === 'focus' && (!newPomo || !newPomo.isActive)) {
      if (focusSessionStartTime) {
        const sessionDuration = (Date.now() - focusSessionStartTime) / 1000;
        await trackFocusTime(sessionDuration);
        focusSessionStartTime = null;
        lastTrackedSecond = 0;
      }
      if (pomoTimerInterval) {
        clearInterval(pomoTimerInterval);
        pomoTimerInterval = null;
      }
    }
    // Session resumed
    else if (newPomo && newPomo.isActive && (!oldPomo || !oldPomo.isActive)) {
      startPomoTimer();
    }
  }
});

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

// Request notification permission on install/startup
const requestNotificationPermission = async () => {
  try {
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

