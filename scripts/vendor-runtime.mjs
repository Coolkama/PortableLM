import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const destinationRoot = path.join(root, 'public', 'runtime', 'wllama');

const expectedPackages = {
  '@wllama/wllama': '3.5.1',
  '@wllama/wllama-compat': '3.5.1',
};

const packageVersion = async (name) => {
  const packagePath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  if (packageJson.version !== expectedPackages[name]) {
    throw new Error(`Expected ${name} ${expectedPackages[name]}, found ${packageJson.version}.`);
  }
  return packageJson.version;
};

const sources = [
  {
    package: '@wllama/wllama',
    source: 'node_modules/@wllama/wllama/esm/wasm/wllama.wasm',
    destination: 'default/wllama.wasm',
  },
  {
    package: '@wllama/wllama-compat',
    source: 'node_modules/@wllama/wllama-compat/wasm/wllama.js',
    destination: 'compat/wllama.js',
  },
  {
    package: '@wllama/wllama-compat',
    source: 'node_modules/@wllama/wllama-compat/wasm/wllama.wasm',
    destination: 'compat/wllama.wasm',
  },
  {
    package: '@wllama/wllama',
    source: 'node_modules/@wllama/wllama/LICENCE',
    destination: 'vendor/LICENCE-wllama.txt',
  },
  {
    package: '@wllama/wllama-compat',
    source: 'node_modules/@wllama/wllama/LICENCE',
    destination: 'vendor/LICENCE-wllama-compat.txt',
  },
];

const sha256 = async (filePath) => {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
};

await Promise.all(Object.keys(expectedPackages).map(packageVersion));
await rm(destinationRoot, { recursive: true, force: true });
await mkdir(destinationRoot, { recursive: true });

const assets = [];
for (const entry of sources) {
  const sourcePath = path.join(root, entry.source);
  const destinationPath = path.join(destinationRoot, entry.destination);
  await stat(sourcePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath);
  const details = await stat(destinationPath);
  assets.push({
    package: entry.package,
    packageVersion: expectedPackages[entry.package],
    path: `runtime/wllama/${entry.destination}`,
    bytes: details.size,
    sha256: await sha256(destinationPath),
  });
}

const manifest = {
  schemaVersion: 1,
  engine: {
    package: '@wllama/wllama',
    version: expectedPackages['@wllama/wllama'],
  },
  compatibilityRuntime: {
    package: '@wllama/wllama-compat',
    version: expectedPackages['@wllama/wllama-compat'],
  },
  assets: assets.sort((a, b) => a.path.localeCompare(b.path)),
};

await writeFile(
  path.join(destinationRoot, 'runtime-assets.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`Vendored ${assets.length} Wllama runtime files.`);
