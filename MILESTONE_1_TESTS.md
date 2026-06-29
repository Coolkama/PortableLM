# Milestone 1 test record

Do not mark a manual test as passed unless a real model produced tokens on that exact platform.

## Automated results

These commands must pass in CI:

```bash
npm ci
npm run vendor:runtime
npm run verify:assets
npm test
npm run build
npm run test:dist
```

| Test | Implemented | Automated | Manually verified | Result | Notes |
|---|---:|---:|---:|---|---|
| Split-part parsing and ordering | Yes | Yes | No | Passed | Includes missing-part detection |
| GGUF magic and bounded header validation | Yes | Yes | Yes | Passed | Android run validated a real GGUF v3 header |
| Invalid magic rejection | Yes | Yes | No | Passed | Unit test |
| Zero-tensor header rejection | Yes | Yes | No | Passed | Unit test |
| Bounded diagnostic log | Yes | Yes | Yes | Passed with follow-up | Entry count is bounded; exported model metadata is still too verbose |
| State-machine lifecycle | Yes | Yes | Partial | Partial | Android load and generation passed; stop/unload/reload remain to be exercised |
| Exact runtime asset presence and hashes | Yes | Yes | Yes | Passed | Deployed runtime loaded successfully on Android |
| GitHub Pages subdirectory paths | Yes | Yes | Yes | Passed | Compiled site and local runtime assets loaded from the project path |
| No required CDN/Hugging Face runtime URL | Yes | Yes | Partial | Partial | No runtime download failure; blocked-origin test remains outstanding |
| Real GGUF inference | Yes | No | Android | Passed on Android | Qwen3-0.6B-Q4_0.gguf loaded and generated successfully |

## Desktop acceptance checklist

Record the browser version, operating system, model filename, model SHA-256, file size, quantisation and physical RAM.

- [ ] Open the deployed GitHub Pages URL in current Chrome or Edge.
- [ ] Confirm no external request is made to Hugging Face, jsDelivr, unpkg or another CDN.
- [ ] Select a 300–500 MB GGUF.
- [ ] Confirm the selected filename and size are correct.
- [ ] Load with one thread and a 1,024-token context.
- [ ] Confirm the page remains interactive during loading.
- [ ] Record model-load duration.
- [ ] Send a short prompt.
- [ ] Confirm streamed tokens appear.
- [ ] Record prompt evaluation, time to first token and tokens per second.
- [ ] Stop one generation and confirm the model remains usable.
- [ ] Unload the model.
- [ ] Load the same model again.
- [ ] Generate again.
- [ ] Export or copy diagnostics and check that prompt and response contents are absent.

## Android acceptance checklist

Status is **Partial pass**. A real model loaded and generated successfully, but the remaining lifecycle and resilience checks must still be completed.

### Recorded run — 29 June 2026

- Browser: Chrome 149.0.0.0 Mobile, as reported by the reduced user-agent string.
- Device and physical RAM: not reported.
- Android version: user-agent reports Android 10, but this may be reduced/frozen browser data and is not treated as authoritative.
- Model: `Qwen3-0.6B-Q4_0.gguf`.
- Model size: 382,156,480 bytes (approximately 364.45 MiB).
- Model hash: not recorded.
- GGUF: version 3, 310 tensors, 32 metadata entries.
- Runtime: Wllama 3.5.1 compatibility engine, worker-based single-thread CPU.
- Context: 1,024 tokens; batch and micro-batch 256.
- Model load: 12,191.6 ms.
- Generation: completed successfully in 29,794.4 ms.
- Worker state after generation: active.
- Environment: HTTPS secure context, WebAssembly and SIMD available, not cross-origin isolated, SharedArrayBuffer unavailable, WebGPU detected but deliberately disabled.
- Privacy check: prompt and response text were absent from the export.
- Instrumentation limitation: prompt evaluation, time to first token, token count and tokens per second were not returned by this runtime path.

- [ ] Record phone model, authoritative Android version and physical RAM.
- [x] Open the deployed GitHub Pages URL in Chrome for Android.
- [x] Select a 300–500 MB GGUF through the Android file picker.
- [x] Load with one thread and a 1,024-token context.
- [ ] Confirm the interface remains responsive during loading.
- [ ] Open and close the virtual keyboard.
- [ ] Rotate portrait to landscape and back without losing interface state.
- [x] Generate with a real local model and complete generation.
- [x] Record model-load and total generation duration.
- [ ] Record time to first token and tokens per second; current instrumentation returned no values.
- [ ] Stop generation and confirm the model remains usable.
- [ ] Background Chrome, return, and record whether the worker survived.
- [ ] Unload and reload the model.
- [ ] Repeat with all external network origins blocked except the already loaded GitHub Pages site.

## Required evidence before tagging

- Deployed URL
- CI run link
- Exact model identity and hash
- Desktop diagnostic export
- Android diagnostic export
- Pass/fail notes for every acceptance step

Only after both required platforms pass may the commit be tagged `v0.1-local-inference-proof` and Milestone 2 begin.
