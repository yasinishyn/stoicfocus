import { AppSettings } from './types';

export interface OnboardingPreferences {
  enableMonochrome: boolean;
  enableMemento: boolean;
  enableDoom: boolean;
  doomLimit?: number;
}

export const ONBOARDING_TOTAL_STEPS = 5;

export const deriveOnboardingSettings = (
  prefs: OnboardingPreferences,
  hardcoreMode: boolean
): Partial<AppSettings> => {
  const doomScrollLimit = prefs.enableDoom
    ? (prefs.doomLimit && prefs.doomLimit > 0 ? prefs.doomLimit : 3)
    : 9999; // effectively disable

  return {
    monochromeMode: prefs.enableMonochrome,
    mementoMoriEnabled: prefs.enableMemento,
    doomScrollLimit,
    hardcoreMode,
  };
};

