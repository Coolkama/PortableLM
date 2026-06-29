import { describe, expect, it } from 'vitest';
import { orderSelectedFiles, parseSplitFilename } from '../src/models/split-file-group.js';

const file = (name, size = 100) => ({ name, size });

describe('parseSplitFilename', () => {
  it('parses llama.cpp split naming', () => {
    expect(parseSplitFilename('model-q4-00002-of-00003.gguf')).toEqual({
      stem: 'model-q4',
      index: 2,
      total: 3,
    });
  });

  it('does not treat an ordinary GGUF as split', () => {
    expect(parseSplitFilename('model-q4.gguf')).toBeNull();
  });
});

describe('orderSelectedFiles', () => {
  it('orders a complete split group by part number', () => {
    const result = orderSelectedFiles([
      file('model-00003-of-00003.gguf'),
      file('model-00001-of-00003.gguf'),
      file('model-00002-of-00003.gguf'),
    ]);
    expect(result.valid).toBe(true);
    expect(result.files.map((item) => item.name)).toEqual([
      'model-00001-of-00003.gguf',
      'model-00002-of-00003.gguf',
      'model-00003-of-00003.gguf',
    ]);
  });

  it('reports a missing split part', () => {
    const result = orderSelectedFiles([
      file('model-00001-of-00003.gguf'),
      file('model-00003-of-00003.gguf'),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Missing split part 00002 of 00003');
  });

  it('rejects unrelated multiple files', () => {
    const result = orderSelectedFiles([file('one.gguf'), file('two.gguf')]);
    expect(result.valid).toBe(false);
  });
});
