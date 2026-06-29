const allowed = {
  idle: ['validating', 'starting-runtime'],
  validating: ['idle', 'starting-runtime', 'failed'],
  'starting-runtime': ['loading-model', 'cancelling', 'failed'],
  'loading-model': ['ready', 'cancelling', 'failed'],
  ready: ['generating', 'unloading', 'failed'],
  generating: ['ready', 'failed'],
  cancelling: ['idle', 'failed'],
  unloading: ['idle', 'failed'],
  failed: ['idle', 'validating', 'starting-runtime'],
};

export class LoadState {
  #value = 'idle';
  #listeners = new Set();

  get value() {
    return this.#value;
  }

  transition(next, detail = '') {
    if (next !== this.#value && !allowed[this.#value]?.includes(next)) {
      throw new Error(`Invalid state transition: ${this.#value} → ${next}.`);
    }
    this.#value = next;
    for (const listener of this.#listeners) listener({ value: next, detail });
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
