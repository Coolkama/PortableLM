const SPLIT_PATTERN = /^(.*?)-(\d{5})-of-(\d{5})\.gguf$/i;

export function parseSplitFilename(name) {
  const match = SPLIT_PATTERN.exec(name);
  if (!match) return null;
  return {
    stem: match[1],
    index: Number.parseInt(match[2], 10),
    total: Number.parseInt(match[3], 10),
  };
}

export function orderSelectedFiles(files) {
  const list = [...files];
  if (list.length === 0) {
    return { valid: false, files: [], errors: ['Select at least one GGUF file.'], split: false };
  }

  const parsed = list.map((file) => ({ file, split: parseSplitFilename(file.name) }));
  const splitEntries = parsed.filter((entry) => entry.split);

  if (splitEntries.length === 0) {
    if (list.length > 1) {
      return {
        valid: false,
        files: list,
        errors: ['Multiple files were selected, but their names do not form one recognised split GGUF group.'],
        split: false,
      };
    }
    return { valid: true, files: list, errors: [], split: false };
  }

  if (splitEntries.length !== list.length) {
    return {
      valid: false,
      files: list,
      errors: ['Do not mix a single GGUF file with split GGUF parts.'],
      split: true,
    };
  }

  const first = splitEntries[0].split;
  const errors = [];
  const seen = new Set();
  for (const entry of splitEntries) {
    const part = entry.split;
    if (part.stem.toLowerCase() !== first.stem.toLowerCase()) errors.push('Selected parts do not share the same model name.');
    if (part.total !== first.total) errors.push('Selected parts disagree about the total number of files.');
    if (part.index < 1 || part.index > part.total) errors.push(`Invalid split index in ${entry.file.name}.`);
    if (seen.has(part.index)) errors.push(`Duplicate split part ${part.index}.`);
    seen.add(part.index);
  }

  for (let index = 1; index <= first.total; index += 1) {
    if (!seen.has(index)) errors.push(`Missing split part ${String(index).padStart(5, '0')} of ${String(first.total).padStart(5, '0')}.`);
  }

  const ordered = splitEntries
    .sort((a, b) => a.split.index - b.split.index)
    .map((entry) => entry.file);

  return {
    valid: errors.length === 0,
    files: ordered,
    errors: [...new Set(errors)],
    split: true,
    stem: first.stem,
    totalParts: first.total,
  };
}
