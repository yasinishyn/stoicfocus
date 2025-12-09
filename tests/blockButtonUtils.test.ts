import { describe, it, expect } from 'vitest';
import { getInitialCollapseState, setCollapseState, BlockButtonState } from '../src/blockButtonUtils';

describe('blockButtonUtils', () => {
  it('returns fallback when no state exists', () => {
    expect(getInitialCollapseState('a.com', undefined, false)).toBe(false);
    expect(getInitialCollapseState('a.com', undefined, true)).toBe(true);
  });

  it('returns stored collapse state for host', () => {
    const state: BlockButtonState = { blockButtonCollapsed: { 'a.com': true } };
    expect(getInitialCollapseState('a.com', state, false)).toBe(true);
    expect(getInitialCollapseState('b.com', state, false)).toBe(false);
  });

  it('sets collapse state immutably', () => {
    const state: BlockButtonState = { blockButtonCollapsed: { 'a.com': true } };
    const next = setCollapseState('b.com', state, false);
    expect(next.blockButtonCollapsed?.['a.com']).toBe(true);
    expect(next.blockButtonCollapsed?.['b.com']).toBe(false);
    // original not mutated
    expect(state.blockButtonCollapsed?.['b.com']).toBeUndefined();
  });
});

