import { describe, it, expect } from 'vitest';
import { getDoomAlertConfig } from '../src/doomUtils';

describe('getDoomAlertConfig', () => {
  it('returns block-only config on first alert', () => {
    const cfg = getDoomAlertConfig(false);
    expect(cfg.label).toBe('DOOM SCROLL DETECTED');
    expect(cfg.showWhitelist).toBe(false);
  });

  it('returns block-or-whitelist config after dismissal', () => {
    const cfg = getDoomAlertConfig(true);
    expect(cfg.label).toBe('DOOM SCROLL DETECTED — Block or Whitelist?');
    expect(cfg.showWhitelist).toBe(true);
  });
});

