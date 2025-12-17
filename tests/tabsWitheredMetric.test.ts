import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const setupChrome = (metrics: any = { tabsWithered: 2, interventions: 1, focusScore: 0, frictionOvercome: 0 }) => {
  (global as any).chrome = {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ metrics }),
        set: vi.fn().mockResolvedValue(undefined),
      },
      sync: {
        get: vi.fn().mockResolvedValue({ settings: {} }),
        set: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
    tabs: { onUpdated: { addListener: vi.fn() }, onActivated: { addListener: vi.fn() }, onRemoved: { addListener: vi.fn() }, onCreated: { addListener: vi.fn() } },
    runtime: { onMessage: { addListener: vi.fn() }, onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
    action: { setIcon: vi.fn(), setTitle: vi.fn(), enable: vi.fn() },
    contextMenus: { create: vi.fn(), onClicked: { addListener: vi.fn() } },
    commands: { onCommand: { addListener: vi.fn() } },
    notifications: { create: vi.fn(), getPermissionLevel: vi.fn() },
  };
};

describe('incrementTabsWitheredMetric', () => {
  beforeEach(() => {
    vi.resetModules();
    setupChrome();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('increments existing tabsWithered', async () => {
    const { incrementTabsWitheredMetric } = await import('../src/background');
    const result = await incrementTabsWitheredMetric();
    expect((global as any).chrome.storage.local.get).toHaveBeenCalledWith('metrics');
    expect((global as any).chrome.storage.local.set).toHaveBeenCalledWith({
      metrics: { interventions: 1, focusScore: 0, tabsWithered: 3, frictionOvercome: 0 },
    });
    expect(result.tabsWithered).toBe(3);
  });

  it('initializes metrics when missing', async () => {
    (global as any).chrome.storage.local.get = vi.fn().mockResolvedValue({});
    (global as any).chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);
    const { incrementTabsWitheredMetric } = await import('../src/background');
    const result = await incrementTabsWitheredMetric();
    expect(result.tabsWithered).toBe(1);
    expect((global as any).chrome.storage.local.set).toHaveBeenCalledWith({
      metrics: { interventions: 0, focusScore: 0, tabsWithered: 1, frictionOvercome: 0 },
    });
  });
});

