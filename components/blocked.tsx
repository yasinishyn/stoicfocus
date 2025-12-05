import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import BlockedView from './BlockedView';
import { AppSettings } from '../src/types';

const BlockedPage = () => {
  const [domain, setDomain] = useState<string>('');
  const [mode, setMode] = useState<'strict' | 'friction' | 'memento'>('strict');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [preMortem, setPreMortem] = useState<string>('');
  const [tabLimit, setTabLimit] = useState<number>(5);

  useEffect(() => {
    const init = async () => {
      // Get URL params
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url') || '';
      const modeParam = params.get('mode') || 'strict';
      const limitParam = params.get('limit');
      
      setDomain(url);
      if (modeParam === 'memento') {
        setMode('memento');
        if (limitParam) {
          setTabLimit(parseInt(limitParam) || 5);
        }
      } else {
        setMode(modeParam === 'friction' ? 'friction' : 'strict');
      }
      
      // Load settings
      const result = await chrome.storage.sync.get('settings');
      setSettings(result.settings || {
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
      });
      
      // Load pre-mortem
      const preMortemResult = await chrome.storage.local.get('preMortem');
      setPreMortem(preMortemResult.preMortem || '');
    };
    
    init();
  }, []);

  const handleReturn = () => {
    // Go to new tab page or dashboard
    chrome.tabs.create({ url: 'chrome://newtab' });
  };

  const handleUnlock = async () => {
    if (domain) {
      try {
        const url = new URL(domain);
        const currentDomain = url.hostname.replace('www.', '').toLowerCase();
        
        // Add to temp unlocked
        const result = await chrome.storage.local.get('tempUnlocked');
        const tempUnlocked = result.tempUnlocked || [];
        if (!tempUnlocked.includes(currentDomain)) {
          tempUnlocked.push(currentDomain);
          await chrome.storage.local.set({ tempUnlocked });
        }
        
        // Navigate to original URL
        window.location.href = domain;
      } catch (e) {
        console.error('Error unlocking:', e);
        handleReturn();
      }
    }
  };

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  return (
    <BlockedView
      domain={domain}
      onReturn={handleReturn}
      mode={mode}
      onUnlock={handleUnlock}
      preMortemResponse={preMortem}
      settings={settings}
      tabLimit={tabLimit}
    />
  );
};

const rootElement = document.getElementById('blocked-root');
if (!rootElement) {
  throw new Error("Could not find blocked-root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BlockedPage />
  </React.StrictMode>
);

