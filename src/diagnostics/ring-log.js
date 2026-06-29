export class RingLog {
  #entries = [];
  #limit;

  constructor(limit = 200) {
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError('Log limit must be a positive integer.');
    this.#limit = limit;
  }

  add(level, message, details) {
    const entry = {
      time: new Date().toISOString(),
      level,
      message: String(message),
    };
    if (details !== undefined) entry.details = normaliseDetails(details);
    this.#entries.push(entry);
    if (this.#entries.length > this.#limit) {
      this.#entries.splice(0, this.#entries.length - this.#limit);
    }
    return entry;
  }

  clear() {
    this.#entries = [];
  }

  toArray() {
    return this.#entries.map((entry) => ({ ...entry }));
  }
}

function normaliseDetails(value) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
