# Known limitations — Milestone 1

1. **No platform is manually verified yet.** Desktop Chrome, desktop Edge and Chrome for Android are all marked Untested.
2. Model loading progress has named stages and elapsed time, but Wllama 3.5.1 does not expose trustworthy local tensor percentages through this path.
3. WASM compilation, tensor loading and context creation occur within one `loadModel()` operation and cannot be timed separately without modifying the engine. Diagnostics say so explicitly.
4. Generation has an `AbortSignal`. Model loading does not. The Cancel button requests `exit()` and reports whether the worker confirms it, but immediate cancellation is not guaranteed.
5. Basic validation checks extension, minimum size, magic bytes, version, tensor count and split naming. It does not fully parse every metadata entry or detect every truncated model.
6. Unsupported architectures, quantisations and metadata are discovered by Wllama during loading.
7. The initial context is conservative, but a 300–500 MB model can still exceed a browser's available memory.
8. Browser memory APIs cannot reliably report native, GPU and WASM peak allocation on every platform.
9. The selected model is not persisted. Reloading the page or restarting an installed application requires selecting it again.
10. There is no service worker or complete PWA in Milestone 1.
11. There are no chats, history, Markdown, mathematics, thinking-output handling, rolling context or network integrations yet.
12. WebGPU and multi-thread CPU execution are deliberately disabled.
13. Wllama 3.5.1's npm package declares a missing root `index.js`; PortableLM uses its present, version-pinned `esm/index.js` entry explicitly.
14. The compatibility worker is fetched from the same static site when the engine instance is prepared. It is never fetched from Wllama's default CDN configuration.
