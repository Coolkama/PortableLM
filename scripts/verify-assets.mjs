import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'runtime', 'wllama', 'runtime-assets.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.engine?.version !== '3.5.1' || manifest.compatibilityRuntime?.version !== '3.5.1') {
  throw new Error('Runtime manifest does not pin Wllama and its compatibility runtime to 3.5.1.');
}

const expectedPaths = new Set([
  'runtime/wllama/default/wllama.wasm',
  'runtime/wllama/compat/wllama.js',
  'runtime/wllama/compat/wllama.wasm',
  'runtime/wllama/vendor/LICENCE-wllama.txt',
  'runtime/wllama/vendor/LICENCE-wllama-compat.txt',
]);

for (const asset of manifest.assets ?? []) {
  if (!expectedPaths.delete(asset.path)) {
    throw new Error(`Unexpected or duplicate runtime asset: ${asset.path}`);
  }
  const absolutePath = path.join(root, 'public', asset.path);
  const details = await stat(absolutePath);
  const bytes = await readFile(absolutePath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (details.size !== asset.bytes) {
    throw new Error(`Size mismatch for ${asset.path}.`);
  }
  if (digest !== asset.sha256) {
    throw new Error(`SHA-256 mismatch for ${asset.path}.`);
  }
}

if (expectedPaths.size > 0) {
  throw new Error(`Missing runtime assets: ${[...expectedPaths].join(', ')}`);
}

const runtimeSourceFiles = [
  'src/main.js',
  'src/inference/wllama-adapter.js',
  'src/ui/app.js',
];
const forbidden = /(?:https?:)?\/\/(?:cdn\.|unpkg\.|cdn\.jsdelivr\.|huggingface\.co)/i;
for (const relativePath of runtimeSourceFiles) {
  const content = await readFile(path.join(root, relativePath), 'utf8');
  if (forbidden.test(content)) {
    throw new Error(`Forbidden external runtime URL found in ${relativePath}.`);
  }
}

console.log('Runtime assets verified, including size and SHA-256 hashes.');
