export const isExtensionContextValid = () => {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
};

export const safeStorageLocalSet = async (items: any): Promise<void> => {
  if (!isExtensionContextValid()) {
    return;
  }
  try {
    await chrome.storage.local.set(items);
  } catch (e: any) {
    if (e?.message && e.message.includes('Extension context invalidated')) {
      return;
    }
    throw e;
  }
};


