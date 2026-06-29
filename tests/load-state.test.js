import { describe, expect, it } from 'vitest';
import { LoadState } from '../src/state/load-state.js';

describe('LoadState', () => {
  it('allows the expected proof lifecycle', () => {
    const state = new LoadState();
    state.transition('validating');
    state.transition('idle');
    state.transition('starting-runtime');
    state.transition('loading-model');
    state.transition('ready');
    state.transition('generating');
    state.transition('ready');
    state.transition('unloading');
    state.transition('idle');
    expect(state.value).toBe('idle');
  });

  it('rejects an impossible transition', () => {
    const state = new LoadState();
    expect(() => state.transition('ready')).toThrow(/Invalid state transition/);
  });
});
