import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function disableWllamaNetworkFallbacks() {
  const expected = new Map([
    [
      'https://cdn.jsdelivr.net/npm/@wllama/wllama-compat@3.5.1/wasm/wllama.js',
      './runtime/wllama/compat/wllama.js',
    ],
    [
      'https://cdn.jsdelivr.net/npm/@wllama/wllama-compat@3.5.1/wasm/wllama.wasm',
      './runtime/wllama/compat/wllama.wasm',
    ],
    ['https://huggingface.co', './network-disabled/huggingface'],
  ]);

  return {
    name: 'portablelm-disable-wllama-network-fallbacks',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@wllama/wllama/esm/index.js')) return null;
      let transformed = code;
      for (const [remote, local] of expected) {
        if (!transformed.includes(remote)) {
          throw new Error(`Pinned Wllama source no longer contains the expected network string: ${remote}`);
        }
        transformed = transformed.replaceAll(remote, local);
      }
      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  // Relative output paths allow the same build to run from any GitHub Pages project subdirectory.
  base: './',
  plugins: [disableWllamaNetworkFallbacks()],
  define: {
    __PORTABLELM_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? 'development').slice(0, 12)),
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text'],
    },
  },
});
