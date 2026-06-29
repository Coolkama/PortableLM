# PortableLM Milestone 1 architecture

## Boundary

Milestone 1 proves only the local inference path. It intentionally excludes the full chat application, network integrations, WebGPU and the final service worker.

## Components

- `src/ui/app.js` owns the proof interface and coordinates the state machine.
- `src/models/` validates bounded GGUF headers and orders split files.
- `src/inference/wllama-adapter.js` is the only module that knows Wllama's API.
- `src/diagnostics/` performs capability probes and keeps a bounded log.
- `src/state/load-state.js` prevents contradictory loading and generation operations.
- `scripts/vendor-runtime.mjs` copies exact third-party runtime assets from the lockfile installation.
- `scripts/verify-assets.mjs` verifies expected files, sizes and SHA-256 hashes.
- `scripts/verify-dist.mjs` rejects missing assets, root-only paths and forbidden CDN references.

## Runtime flow

1. The browser reads at most the first 24 bytes of each selected file for basic validation.
2. Split parts are grouped and ordered by filename.
3. The adapter constructs Wllama with a same-site URL for the primary WASM file.
4. The locally vendored compatibility worker is read as text and supplied directly to `setCompat`.
5. Wllama creates and manages its internal worker.
6. `loadModel(File[])` receives the original browser `File` objects.
7. The engine loads the model using one CPU thread, a conservative context and no GPU layers.
8. Chat completion is used when the model contains a chat template; raw completion is used otherwise.
9. Text chunks are rendered with `textContent`, never as executable HTML.
10. `AbortController` stops generation. Loading cancellation requests worker exit because Wllama exposes no dedicated load abort signal.
11. `exit()` unloads the runtime and model.

## Memory statement

PortableLM does not convert the complete model to base64, a JavaScript string or an application-owned `ArrayBuffer`. It passes browser `File` objects to Wllama. Wllama may still allocate model-sized memory within WebAssembly and may use a full-copy fallback depending on browser capabilities. This milestone therefore makes no zero-copy claim.

## Static hosting

Vite emits relative URLs using `base: './'`. The application has no client-side routes, so it can run at `https://<user>.github.io/<repository>/` without assuming the domain root.

## Security

- No model-generated HTML is executed.
- No external runtime origin is configured.
- The verification scripts scan production text assets for known CDN and Hugging Face runtime URLs.
- Diagnostics omit prompt and response text.
- Logs are bounded to 200 entries in memory.
- WebGPU is explicitly disabled with `n_gpu_layers: 0`.
