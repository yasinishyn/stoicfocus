import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeStorageLocalSet } from '../src/storageHelpers';

describe('safeStorageLocalSet', () => {
  beforeEach(() => {
    (global as any).chrome = {
      runtime: { id: 'test' },
      storage: {
        local: {
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    };
  });

  it('calls chrome.storage.local.set when context is valid', async () => {
    const spy = (global as any).chrome.storage.local.set;
    await expect(safeStorageLocalSet({ foo: 'bar' })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('no-ops when context is invalid', async () => {
    (global as any).chrome.runtime.id = undefined;
    const spy = (global as any).chrome.storage.local.set;
    await expect(safeStorageLocalSet({ foo: 'bar' })).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});

