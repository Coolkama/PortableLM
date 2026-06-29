import { orderSelectedFiles } from './split-file-group.js';

const HEADER_BYTES = 24;
const SUPPORTED_KNOWN_VERSIONS = new Set([2, 3]);

export async function validateGgufSelection(selectedFiles) {
  const grouping = orderSelectedFiles(selectedFiles);
  const errors = [...grouping.errors];
  const warnings = [];
  const files = grouping.files;
  const headers = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      errors.push(`${file.name}: the filename must end in .gguf.`);
      continue;
    }
    if (file.size < HEADER_BYTES) {
      errors.push(`${file.name}: the file is too small to contain a GGUF header.`);
      continue;
    }

    let buffer;
    try {
      buffer = await file.slice(0, HEADER_BYTES).arrayBuffer();
    } catch (error) {
      errors.push(`${file.name}: the browser could not read the file header (${safeError(error)}).`);
      continue;
    }

    const bytes = new Uint8Array(buffer);
    const magic = String.fromCharCode(...bytes.slice(0, 4));
    if (magic !== 'GGUF') {
      errors.push(`${file.name}: invalid GGUF magic bytes.`);
      continue;
    }

    const view = new DataView(buffer);
    const version = view.getUint32(4, true);
    const tensorCount = readUint64(view, 8);
    const metadataCount = readUint64(view, 16);

    if (!SUPPORTED_KNOWN_VERSIONS.has(version)) {
      warnings.push(`${file.name}: GGUF version ${version} has not been verified by PortableLM.`);
    }
    if (tensorCount === 0n) {
      errors.push(`${file.name}: the header reports no tensors.`);
    }

    headers.push({
      name: file.name,
      version,
      tensorCount: tensorCount.toString(),
      metadataCount: metadataCount.toString(),
    });
  }

  return {
    valid: errors.length === 0 && files.length > 0,
    files,
    split: grouping.split,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    headers,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  };
}

function readUint64(view, offset) {
  if (typeof view.getBigUint64 === 'function') return view.getBigUint64(offset, true);
  const low = BigInt(view.getUint32(offset, true));
  const high = BigInt(view.getUint32(offset + 4, true));
  return (high << 32n) | low;
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error);
}
