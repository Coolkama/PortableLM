import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const required = [
  'index.html',
  'runtime/wllama/default/wllama.wasm',
  'runtime/wllama/compat/wllama.js',
  'runtime/wllama/compat/wllama.wasm',
  'runtime/wllama/runtime-assets.json',
];

for (const relativePath of required) {
  const details = await stat(path.join(dist, relativePath));
  if (!details.isFile() || details.size === 0) {
    throw new Error(`Missing or empty production file: ${relativePath}`);
  }
}

const files = [];
const walk = async (directory) => {
  for (const name of await readdir(directory)) {
    const absolutePath = path.join(directory, name);
    const details = await stat(absolutePath);
    if (details.isDirectory()) await walk(absolutePath);
    else files.push(absolutePath);
  }
};
await walk(dist);

const forbidden = /(?:https?:)?\/\/(?:cdn\.|unpkg\.|cdn\.jsdelivr\.|huggingface\.co)/i;
for (const file of files.filter((entry) => /\.(?:html|js|css|json|map)$/.test(entry))) {
  const content = await readFile(file, 'utf8');
  if (forbidden.test(content)) {
    throw new Error(`Forbidden external runtime URL found in ${path.relative(dist, file)}.`);
  }
}

const index = await readFile(path.join(dist, 'index.html'), 'utf8');
if (/\b(?:src|href)="\/[^/"]/.test(index)) {
  throw new Error('Production index contains a domain-root asset path and may fail from a project subdirectory.');
}

console.log(`Production build verified (${files.length} files).`);
