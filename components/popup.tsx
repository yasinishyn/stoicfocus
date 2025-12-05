import React from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import TrayMenu from './TrayMenu';
import { AppSettings, PomodoroState } from '../src/types';

// Initialize state from storage
const loadSettings = async (): Promise<AppSettings> => {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || {
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
};

const loadPomo = async (): Promise<PomodoroState> => {
  const result = await chrome.storage.local.get('pomo');
  return result.pomo || { isActive: false, mode: 'focus', timeLeft: 25 * 60 };
};

const loadPreMortem = async (): Promise<string> => {
  const result = await chrome.storage.local.get('preMortem');
  return result.preMortem || '';
};

const PopupApp = () => {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [pomo, setPomo] = React.useState<PomodoroState | null>(null);
  const [preMortem, setPreMortem] = React.useState<string>('');
  const [currentDomain, setCurrentDomain] = React.useState<string>('');

  React.useEffect(() => {
    const init = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) {
        try {
          const url = new URL(tab.url);
          setCurrentDomain(url.hostname);
        } catch {
          setCurrentDomain(tab.url);
        }
      }

      const loadedSettings = await loadSettings();
      const loadedPomo = await loadPomo();
      const loadedPreMortem = await loadPreMortem();

      setSettings(loadedSettings);
      setPomo(loadedPomo);
      setPreMortem(loadedPreMortem);
    };
    init();
  }, []);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await chrome.storage.sync.set({ settings: newSettings });
    // Notify background script
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });
  };

  const handleOpenPage = async (url: string) => {
    if (url.startsWith('chrome://')) {
      // Open dashboard in new tab
      if (url.includes('boundaries') || url.includes('settings')) {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html' + (url.includes('settings') ? '#settings' : url.includes('greylist') ? '#greylist' : '')) });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      }
    } else {
      chrome.tabs.create({ url });
    }
  };

  const handleSetPomo = async (newPomo: PomodoroState) => {
    setPomo(newPomo);
    await chrome.storage.local.set({ pomo: newPomo });
  };

  const handleSetPreMortem = async (reason: string) => {
    setPreMortem(reason);
    await chrome.storage.local.set({ preMortem: reason });
  };

  if (!settings || !pomo) {
    return (
      <div className="w-[400px] h-[600px] flex items-center justify-center bg-white">
        <div className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  return (
    <TrayMenu
      onClose={() => window.close()}
      settings={settings}
      onUpdateSettings={handleUpdateSettings}
      currentDomain={currentDomain}
      onOpenPage={handleOpenPage}
      pomo={pomo}
      setPomo={handleSetPomo}
      setPreMortem={handleSetPreMortem}
    />
  );
};

const rootElement = document.getElementById('popup-root');
if (!rootElement) {
  throw new Error("Could not find popup-root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);

