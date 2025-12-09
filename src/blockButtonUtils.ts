export interface BlockButtonState {
  blockButtonCollapsed?: Record<string, boolean>;
}

export const getInitialCollapseState = (
  host: string,
  state?: BlockButtonState,
  fallback: boolean = false
): boolean => {
  if (!host) return fallback;
  return state?.blockButtonCollapsed?.[host] ?? fallback;
};

export const setCollapseState = (
  host: string,
  state: BlockButtonState = {},
  value: boolean
): BlockButtonState => {
  const next = { ...(state.blockButtonCollapsed || {}) };
  next[host] = value;
  return { ...state, blockButtonCollapsed: next };
};

