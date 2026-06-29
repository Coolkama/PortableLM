import { describe, expect, it } from 'vitest';
import { RingLog } from '../src/diagnostics/ring-log.js';

describe('RingLog', () => {
  it('keeps only the newest bounded entries', () => {
    const log = new RingLog(2);
    log.add('info', 'one');
    log.add('info', 'two');
    log.add('info', 'three');
    expect(log.toArray().map((entry) => entry.message)).toEqual(['two', 'three']);
  });

  it('normalises Error details without retaining arbitrary private properties', () => {
    const log = new RingLog(2);
    log.add('error', 'failed', new Error('safe message'));
    expect(log.toArray()[0].details).toEqual({ name: 'Error', message: 'safe message' });
  });
});
