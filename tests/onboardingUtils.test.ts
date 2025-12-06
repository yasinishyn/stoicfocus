import { describe, it, expect } from 'vitest';
import { deriveOnboardingSettings, ONBOARDING_TOTAL_STEPS } from '../src/onboardingUtils';

describe('deriveOnboardingSettings', () => {
  it('enables features and keeps doom limit when enabled', () => {
    const result = deriveOnboardingSettings(
      { enableMonochrome: true, enableMemento: true, enableDoom: true, doomLimit: 7 },
      true
    );
    expect(result.monochromeMode).toBe(true);
    expect(result.mementoMoriEnabled).toBe(true);
    expect(result.doomScrollLimit).toBe(7);
    expect(result.hardcoreMode).toBe(true);
  });

  it('disables doom by setting a high limit when toggled off', () => {
    const result = deriveOnboardingSettings(
      { enableMonochrome: false, enableMemento: false, enableDoom: false },
      false
    );
    expect(result.monochromeMode).toBe(false);
    expect(result.mementoMoriEnabled).toBe(false);
    expect(result.doomScrollLimit).toBe(9999);
    expect(result.hardcoreMode).toBe(false);
  });

  it('defaults doom limit to 3 when enabled without a provided limit', () => {
    const result = deriveOnboardingSettings(
      { enableMonochrome: false, enableMemento: true, enableDoom: true },
      false
    );
    expect(result.doomScrollLimit).toBe(3);
  });

  it('exports total onboarding steps as 5', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(5);
  });
});

