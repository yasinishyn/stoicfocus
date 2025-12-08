
export interface BlockedSite {
  id: string;
  domain: string;
  type: 'domain' | 'category';
  category: string; 
  listType: 'blocklist' | 'greylist' | 'whitelist'; // Separation of concerns
  redirectUrl?: string;
  redirectCount: number;
  restriction?: 'strict' | 'friction'; // strict = block, friction = typing tax
}

export interface Quote {
  text: string;
  author: string;
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  active: boolean;
  isPinned: boolean;
  timestamp: number; // For Memento Mori (oldest dies)
}

export interface PomodoroState {
  isActive: boolean;
  mode: 'focus' | 'break';
  timeLeft: number; // in seconds
  preMortemCaptured?: boolean; // whether negative visualization was provided for current focus session
}

export interface AppSettings {
  enabled: boolean;
  hardcoreMode: boolean;
  showInjectedIcon: boolean;
  soundEffects: boolean;
  monochromeMode: boolean;
  mementoMoriEnabled: boolean;
  tabLimit: number;
  doomScrollLimit: number; // New: Limit in pages/screens
  geminiApiKey: string; // New field for optional AI
  focusDuration: number; // in minutes
  breakDuration: number; // in minutes
  negativeVisualization: boolean; // Configurable pre-mortem
  frictionDurationMinutes?: number; // How long greylist friction stays unlocked
}

export interface AppMetrics {
  interventions: number;
  focusScore: number;
  tabsWithered: number;
  frictionOvercome: number;
}

export interface DailyTimeData {
  date: string; // YYYY-MM-DD format
  hours: number; // Total hours focused that day
}

export interface WeeklyTimeData {
  [date: string]: number; // date -> hours
}