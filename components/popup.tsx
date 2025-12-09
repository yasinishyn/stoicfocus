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
};

const loadPomo = async (): Promise<PomodoroState> => {
  const result = await chrome.storage.local.get('pomo');
  return result.pomo || { isActive: false, mode: 'focus', timeLeft: 25 * 60, preMortemCaptured: false };
};

const loadPreMortem = async (): Promise<string> => {
  const result = await chrome.storage.local.get('preMortem');
  return result.preMortem || '';
};

const PopupApp = () => {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [pomo, setPomo] = React.useState<PomodoroState | null>(null);
  const [preMortem, setPreMortem] = React.useState<string>('');
  React.useEffect(() => {
    const init = async () => {
      const loadedSettings = await loadSettings();
      const loadedPomo = await loadPomo();
      const loadedPreMortem = await loadPreMortem();

      setSettings(loadedSettings);
      setPomo(loadedPomo);
      setPreMortem(loadedPreMortem);
    };
    init();

    const handleStorageChange = (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => {
      if (areaName === 'local' && changes.pomo && changes.pomo.newValue) {
        setPomo(changes.pomo.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await chrome.storage.sync.set({ settings: newSettings });
    // Notify background script
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });
  };

  const handleOpenPage = async (target: 'dashboard' | 'settings' | 'greylist') => {
    const baseUrl = chrome.runtime.getURL('dashboard.html');
    const targetUrl =
      target === 'settings'
        ? `${baseUrl}#settings`
        : target === 'greylist'
        ? `${baseUrl}#greylist`
        : baseUrl;

    // Try to focus an existing dashboard tab; if none, create one at the correct hash
    const existingTabs = await chrome.tabs.query({ url: baseUrl + '*' });
    if (existingTabs.length > 0 && existingTabs[0].id !== undefined) {
      await chrome.tabs.update(existingTabs[0].id, { url: targetUrl, active: true });
      if (existingTabs[0].windowId !== undefined) {
        await chrome.windows.update(existingTabs[0].windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: targetUrl });
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

