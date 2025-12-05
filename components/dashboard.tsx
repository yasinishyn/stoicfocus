import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import Dashboard from './DashboardComponent';
import OnboardingModal from './OnboardingModal';
import { BlockedSite, AppSettings, AppMetrics, PomodoroState } from '../src/types';

const INITIAL_CATEGORIES: Record<string, string[]> = {
  social: ['x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'reddit.com', 'threads.net', 'pinterest.com', 'snapchat.com'],
  news: ['cnn.com', 'nytimes.com', 'bbc.com', 'reuters.com', 'theguardian.com'],
  shopping: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com'],
  entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'spotify.com'],
  custom: []
};

const normalizeListType = (lt: string): 'blocklist' | 'greylist' | 'whitelist' => {
  if (lt === 'blacklist') return 'blocklist';
  if (lt === 'whitelist') return 'whitelist';
  if (lt === 'greylist') return 'greylist';
  return 'blocklist';
};

const DashboardApp = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState<Record<string, string[]>>(INITIAL_CATEGORIES);
  const [metrics, setMetrics] = useState<AppMetrics>({
    interventions: 0,
    focusScore: 0,
    tabsWithered: 0,
    frictionOvercome: 0
  });
  const [initialTab, setInitialTab] = useState<'dashboard' | 'greylist' | 'analytics' | 'settings' | 'manual'>('dashboard');

  useEffect(() => {
    const init = async () => {
      // Load onboarding state
      const onboardResult = await chrome.storage.local.get('hasOnboarded');
      const onboarded = onboardResult.hasOnboarded || false;
      setHasOnboarded(onboarded);
      setShowOnboarding(!onboarded);
      
      // Load settings
      const settingsResult = await chrome.storage.sync.get('settings');
      const loadedSettings = settingsResult.settings || {
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
      setSettings(loadedSettings);
      
      // Load blocked sites
      const sitesResult = await chrome.storage.sync.get('blockedSites');
      const normalizedSites: BlockedSite[] = (sitesResult.blockedSites || []).map((s: any) => ({
        ...s,
        listType: normalizeListType(s.listType)
      }));
      setBlockedSites(normalizedSites);
      
      // Load category definitions
      const catResult = await chrome.storage.sync.get('categoryDefinitions');
      const loadedCats: Record<string, string[]> = catResult.categoryDefinitions || {};
      const mergedCats: Record<string, string[]> = { ...INITIAL_CATEGORIES, ...loadedCats };
      Object.keys(INITIAL_CATEGORIES).forEach(key => {
        if (!mergedCats[key] || mergedCats[key].length === 0) {
          mergedCats[key] = INITIAL_CATEGORIES[key];
        }
      });
      setCategoryDefinitions(mergedCats);
      await chrome.storage.sync.set({ categoryDefinitions: mergedCats });
      
      // Load metrics
      const metricsResult = await chrome.storage.local.get('metrics');
      setMetrics(metricsResult.metrics || {
        interventions: 0,
        focusScore: 0,
        tabsWithered: 0,
        frictionOvercome: 0
      });
      
      // Check URL hash for initial tab
      const hash = window.location.hash.replace('#', '');
      if (hash === 'settings') setInitialTab('settings');
      else if (hash === 'greylist') setInitialTab('greylist');
      else if (hash === 'analytics') setInitialTab('analytics');
      else if (hash === 'manual') setInitialTab('manual');
    };
    
    init();
    
    // Listen for storage changes to update dashboard in real-time
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: 'sync' | 'local' | 'session'
    ) => {
      if (areaName === 'sync') {
        if (changes.blockedSites && changes.blockedSites.newValue !== undefined) {
          const normalizedSites: BlockedSite[] = (changes.blockedSites.newValue || []).map((s: any) => ({
            ...s,
            listType: normalizeListType(s.listType)
          }));
          setBlockedSites(normalizedSites);
        }
        if (changes.categoryDefinitions && changes.categoryDefinitions.newValue !== undefined) {
          setCategoryDefinitions(changes.categoryDefinitions.newValue || INITIAL_CATEGORIES);
        }
        if (changes.settings && changes.settings.newValue !== undefined) {
          setSettings(changes.settings.newValue || null);
        }
      }
      if (areaName === 'local') {
        if (changes.metrics && changes.metrics.newValue !== undefined) {
          setMetrics(changes.metrics.newValue || {
            interventions: 0,
            focusScore: 0,
            tabsWithered: 0,
            frictionOvercome: 0
          });
        }
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await chrome.storage.sync.set({ settings: newSettings });
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });
  };

  const handleAddSite = async (value: string, type: 'domain' | 'category', listType: 'blocklist' | 'greylist' | 'whitelist', manualCategory?: string) => {
    const updatedCategories = { ...categoryDefinitions };
    let categoryToUse = manualCategory || 'custom';
    if (type === 'category') {
      categoryToUse = value;
      const defaults = INITIAL_CATEGORIES[value] || [];
      if (!updatedCategories[value] || updatedCategories[value].length === 0) {
        updatedCategories[value] = defaults;
      }
      setCategoryDefinitions(updatedCategories);
      await chrome.storage.sync.set({ categoryDefinitions: updatedCategories });
    }

    const newSite: BlockedSite = {
      id: Math.random().toString(36).substr(2, 9),
      domain: value,
      type,
      category: categoryToUse,
      listType,
      redirectCount: 0
    };
    const updated = [...blockedSites, newSite];
    setBlockedSites(updated);
    await chrome.storage.sync.set({ blockedSites: updated });
  };

  const handleRemoveSite = async (id: string) => {
    const updated = blockedSites.filter(s => s.id !== id);
    setBlockedSites(updated);
    await chrome.storage.sync.set({ blockedSites: updated });
  };

  const handleUpdateSiteName = async (id: string, newName: string) => {
    const updated = blockedSites.map(site => site.id === id ? { ...site, domain: newName } : site);
    setBlockedSites(updated);
    await chrome.storage.sync.set({ blockedSites: updated });
  };

  const handleUpdateSiteCategory = async (id: string, newCategory: string) => {
    const updated = blockedSites.map(site => site.id === id ? { ...site, category: newCategory } : site);
    setBlockedSites(updated);
    await chrome.storage.sync.set({ blockedSites: updated });
  };

  const handleRenameInnerDomain = async (categoryKey: string, oldDomain: string, newDomain: string) => {
    const updated = {
      ...categoryDefinitions,
      [categoryKey]: (categoryDefinitions[categoryKey] || []).map(d => d === oldDomain ? newDomain : d)
    };
    setCategoryDefinitions(updated);
    await chrome.storage.sync.set({ categoryDefinitions: updated });
  };

  const handleMergeSites = async (sourceId: string, targetId: string) => {
    const source = blockedSites.find(s => s.id === sourceId);
    const target = blockedSites.find(s => s.id === targetId);
    if (!source || !target) return;
    
    const newCategoryId = `custom-${Date.now()}`;
    const updated = {
      ...categoryDefinitions,
      [newCategoryId]: [source.domain, target.domain]
    };
    setCategoryDefinitions(updated);
    await chrome.storage.sync.set({ categoryDefinitions: updated });
    
    const newGroup: BlockedSite = {
      id: target.id,
      domain: `${target.domain} & ${source.domain}`,
      type: 'category',
      category: newCategoryId,
      listType: target.listType,
      redirectCount: (source.redirectCount || 0) + (target.redirectCount || 0)
    };
    
    const updatedSites = [...blockedSites.filter(s => s.id !== sourceId && s.id !== targetId), newGroup];
    setBlockedSites(updatedSites);
    await chrome.storage.sync.set({ blockedSites: updatedSites });
  };

  const handleMoveInnerDomain = async (domain: string, fromCategory: string, targetId: string) => {
    const updated = {
      ...categoryDefinitions,
      [fromCategory]: (categoryDefinitions[fromCategory] || []).filter(d => d !== domain)
    };
    
    const target = blockedSites.find(s => s.id === targetId);
    if (target) {
      if (target.type === 'category') {
        updated[target.category] = [...(updated[target.category] || []), domain];
      } else {
        const newCategoryId = `custom-${Date.now()}`;
        updated[newCategoryId] = [target.domain, domain];
        
        const newGroup: BlockedSite = {
          id: target.id,
          domain: target.domain,
          type: 'category',
          category: newCategoryId,
          listType: target.listType,
          redirectCount: target.redirectCount
        };
        const updatedSites = [...blockedSites.filter(s => s.id !== targetId), newGroup];
        setBlockedSites(updatedSites);
        await chrome.storage.sync.set({ blockedSites: updatedSites });
      }
    }
    
    setCategoryDefinitions(updated);
    await chrome.storage.sync.set({ categoryDefinitions: updated });
  };

  const handleRemoveFromCategory = async (siteId: string, domainToRemove: string) => {
    const site = blockedSites.find(s => s.id === siteId);
    if (!site) return;
    
    const updated = {
      ...categoryDefinitions,
      [site.category]: (categoryDefinitions[site.category] || []).filter(d => d !== domainToRemove)
    };
    setCategoryDefinitions(updated);
    await chrome.storage.sync.set({ categoryDefinitions: updated });
    
    const newSite: BlockedSite = {
      id: Math.random().toString(36).substr(2, 9),
      domain: domainToRemove,
      type: 'domain',
      category: 'custom',
      listType: site.listType,
      redirectCount: 0
    };
    const updatedSites = [...blockedSites, newSite];
    setBlockedSites(updatedSites);
    await chrome.storage.sync.set({ blockedSites: updatedSites });
  };

  const handleOnboardingClose = async () => {
    setHasOnboarded(true);
    setShowOnboarding(false);
    await chrome.storage.local.set({ hasOnboarded: true });
  };

  const handleOpenOnboarding = async () => {
    setShowOnboarding(true);
  };

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  const stats = [{ name: 'Mon', value: 4 }, { name: 'Tue', value: 3 }, { name: 'Wed', value: 8 }, { name: 'Thu', value: 2 }, { name: 'Fri', value: 6 }, { name: 'Sat', value: 1 }, { name: 'Sun', value: 2 }];

  return (
    <>
      {(!hasOnboarded || showOnboarding) && (
        <OnboardingModal
          onClose={handleOnboardingClose}
          onUpdateSettings={(s) => handleUpdateSettings({ ...settings, ...s })}
        />
      )}
      <Dashboard
        blockedSites={blockedSites}
        stats={stats}
        metrics={metrics}
        categoryDefinitions={categoryDefinitions}
        addSite={handleAddSite}
        removeSite={handleRemoveSite}
        updateSiteName={handleUpdateSiteName}
        updateSiteCategory={handleUpdateSiteCategory}
        renameInnerDomain={handleRenameInnerDomain}
        onMergeSites={handleMergeSites}
        onMoveInnerDomain={handleMoveInnerDomain}
        onRemoveFromCategory={handleRemoveFromCategory}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        initialTab={initialTab}
        onRequestOnboarding={handleOpenOnboarding}
      />
    </>
  );
};

const rootElement = document.getElementById('dashboard-root');
if (!rootElement) {
  throw new Error("Could not find dashboard-root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
