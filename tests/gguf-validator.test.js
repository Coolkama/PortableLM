import { describe, expect, it } from 'vitest';
import { validateGgufSelection } from '../src/models/gguf-validator.js';

function ggufFile(name = 'model.gguf', { version = 3, tensors = 12n, metadata = 4n, magic = 'GGUF' } = {}) {
  const bytes = new Uint8Array(64);
  bytes.set([...magic].map((character) => character.charCodeAt(0)), 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, version, true);
  view.setBigUint64(8, tensors, true);
  view.setBigUint64(16, metadata, true);
  return new File([bytes], name, { type: 'application/octet-stream' });
}

describe('validateGgufSelection', () => {
  it('accepts a basic version 3 GGUF header', async () => {
    const result = await validateGgufSelection([ggufFile()]);
    expect(result.valid).toBe(true);
    expect(result.headers[0]).toMatchObject({ version: 3, tensorCount: '12', metadataCount: '4' });
  });

  it('rejects invalid magic bytes', async () => {
    const result = await validateGgufSelection([ggufFile('wrong.gguf', { magic: 'NOPE' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('invalid GGUF magic bytes');
  });

  it('rejects a header that reports no tensors', async () => {
    const result = await validateGgufSelection([ggufFile('empty.gguf', { tensors: 0n })]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('reports no tensors');
  });

  it('warns rather than pretending to support an unknown GGUF version', async () => {
    const result = await validateGgufSelection([ggufFile('future.gguf', { version: 99 })]);
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toContain('has not been verified');
  });
});
