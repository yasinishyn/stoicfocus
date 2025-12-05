// Content Script for StoicFocus Extension

interface AppSettings {
  enabled: boolean;
  showInjectedIcon: boolean;
  doomScrollLimit: number;
  monochromeMode: boolean;
  mementoMoriEnabled: boolean;
}

interface BlockedSite {
  id: string;
  domain: string;
  type: 'domain' | 'category';
  category: string;
  listType: 'blacklist' | 'greylist';
}

interface CategoryDefinitions {
  [key: string]: string[];
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
    if (e.message && e.message.includes('Extension context invalidated')) {
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
      monochromeMode: true,
      mementoMoriEnabled: false
    };
  } catch (e) {
    // Return defaults if error
    return {
      enabled: true,
      showInjectedIcon: true,
      doomScrollLimit: 3,
      monochromeMode: true,
      mementoMoriEnabled: false
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
    <button style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 16px;
      min-width: 156px;
      min-height: 48px;
      background-color: #dc2626;
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      font-family: 'Space Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 10px 20px rgba(0,0,0,0.25);
      transform: translateZ(0);
      letter-spacing: 0.06em;
      line-height: 1;
      filter: none !important;
      -webkit-filter: none !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
      <span style="white-space: nowrap;">BLOCK SITE</span>
    </button>
    <div class="stoicfocus-block-handle" title="Toggle block button">&#9654;</div>
  `;
  
  const btn = button.querySelector('button');
  const handle = button.querySelector('.stoicfocus-block-handle') as HTMLElement | null;
  let collapsed = blockButtonCollapsed;

  const setCollapsed = (state: boolean) => {
    collapsed = state;
    blockButtonCollapsed = state;
    if (collapsed) {
      button.classList.add('stoicfocus-collapsed');
      if (handle) handle.innerHTML = '&#9664;'; // left arrow
    } else {
      button.classList.remove('stoicfocus-collapsed');
      if (handle) handle.innerHTML = '&#9654;'; // right arrow
    }
  };

  if (handle) {
    handle.addEventListener('click', (e) => {
      e.stopPropagation();
      setCollapsed(!collapsed);
    });
  }

  if (btn) {
    btn.addEventListener('click', async () => {
      const currentUrl = window.location.href;
      try {
        if (!isExtensionContextValid()) {
          console.warn('Extension context invalidated. Please reload the page.');
          return;
        }
        
        const url = new URL(currentUrl);
        const domain = url.hostname;
        // Apply monochrome immediately to avoid flicker while redirecting
        applyMonochrome(true);
        
        // Get current blocked sites
        const result = await safeStorageGet('blockedSites');
        const blockedSites = result.blockedSites || [];
        
        // Check if already blocked
        const alreadyBlocked = blockedSites.some((s: BlockedSite) => 
          s.domain === domain && s.listType === 'blacklist'
        );
        
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
          // Redirect immediately to blocked page
          const blockedUrl = safeRuntimeGetURL(`blocked.html?url=${encodeURIComponent(currentUrl)}&mode=strict`);
          if (blockedUrl) {
            window.location.href = blockedUrl;
          } else {
            window.location.reload();
          }
        }
      } catch (e) {
        if (e.message && !e.message.includes('Extension context invalidated')) {
          console.error('Error blocking site:', e);
        }
      }
    });
  }
  
  return button;
};

const ensureBlockButton = (recreate = false) => {
  if (!isExtensionContextValid()) return;
  const existing = document.getElementById('stoicfocus-block-button');
  if (existing && !recreate) return;
  if (existing && recreate) existing.remove();
  const btn = createBlockButton();
  document.body.appendChild(btn);
};

// Doom scroll detection
let scrollPages = 0;
let lastScrollTop = 0;
let scrollTimeout: number | null = null;

const handleScroll = async () => {
  const settings = await loadSettings();
  if (!settings.enabled) return;
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const clientHeight = window.innerHeight;
  const pagesScrolled = scrollTop / clientHeight;
  
  if (pagesScrolled > settings.doomScrollLimit) {
    // Show doom scroll alert
    const alert = document.createElement('div');
    alert.id = 'stoicfocus-doom-alert';
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999998;
      background-color: #dc2626;
      color: white;
      padding: 16px 20px;
      border-radius: 4px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      animation: pulse 2s infinite;
    `;
    alert.textContent = 'DOOM SCROLL DETECTED';
    document.body.appendChild(alert);
    
    // Update block button to show alert state
    const blockBtn = document.getElementById('stoicfocus-block-button');
    if (blockBtn) {
      const btn = blockBtn.querySelector('button');
      if (btn) {
        btn.style.backgroundColor = '#dc2626';
        btn.style.animation = 'pulse 2s infinite';
      }
    }
    
    // Remove alert after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);
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
      gap: 8px !important;
      align-items: center !important;
      transition: transform 0.2s ease, opacity 0.2s ease !important;
    }
    #stoicfocus-block-button.stoicfocus-collapsed {
      transform: translateX(calc(100% - 18px)) translateZ(0) !important;
      opacity: 0.92 !important;
    }
    #stoicfocus-block-button button {
      position: relative !important;
      inset: auto !important;
      z-index: 1 !important;
      transform: translateZ(0) !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
    }
    #stoicfocus-block-button .stoicfocus-block-handle {
      width: 32px !important;
      height: 48px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #dc2626 !important;
      color: #ffffff !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      box-shadow: 0 8px 16px rgba(0,0,0,0.18) !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      user-select: none !important;
      mix-blend-mode: normal !important;
      isolation: isolate !important;
      transform: translateZ(0) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
    }
    #stoicfocus-doom-alert,
    #stoicfocus-monochrome-notification {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      left: auto !important;
      z-index: 2147483647 !important;
      transform: translateZ(0) !important;
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
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background-color: #dc2626;
    color: white;
    padding: 16px 20px;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    animation: pulse 2s infinite;
  `;
  notification.textContent = 'STOIC MONOCHROME MODE ACTIVATED';
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
    if (isExtensionPage() || isPdfPage() || isWhitelisted) {
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
const init = async () => {
  const settings = await loadSettings();
  
  if (!settings.enabled) return;
  
  // Add block button if enabled
  if (settings.showInjectedIcon) {
    ensureBlockButton();
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
  
  // Check for greylist and show typing tax if needed
  const { blockedSites, categoryDefinitions } = await loadBlockedSites();
  const currentDomain = window.location.hostname.replace('www.', '').toLowerCase();
  
  const isDomainInList = (site: BlockedSite, list: 'greylist' | 'blocklist' | 'whitelist') => {
    const listType = (site as any).listType === 'blacklist' ? 'blocklist' : site.listType;
    if (listType !== list) return false;
    if (site.type === 'domain') {
      return domainsMatch(currentDomain, site.domain);
    } else {
      const domains = categoryDefinitions[site.category] || [];
      return domains.some(d => domainsMatch(currentDomain, d));
    }
  };

  const inBlock = blockedSites.some(s => isDomainInList(s, 'blocklist'));
  const inGrey = blockedSites.some(s => isDomainInList(s, 'greylist'));
  const inWhite = blockedSites.some(s => isDomainInList(s, 'whitelist'));

  isWhitelisted = inWhite && !inBlock && !inGrey;

  if (inGrey && !inBlock && !isWhitelisted) {
    try {
      // Check if temporarily unlocked
      const unlocked = await safeStorageLocalGet('tempUnlocked');
      const tempUnlocked = unlocked.tempUnlocked || [];
      
      if (!tempUnlocked.includes(currentDomain)) {
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
    if (settings.showInjectedIcon) {
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
      if (changes.settings && areaName === 'sync') {
        // Reset applied state when settings change
        monochromeApplied = false;
        applyMonochrome(false);
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

