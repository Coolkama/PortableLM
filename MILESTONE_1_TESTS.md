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
| Split-part parsing and ordering | Yes | Yes | No | Pending CI | Includes missing-part detection |
| GGUF magic and bounded header validation | Yes | Yes | No | Pending CI | Does not fully parse metadata |
| Invalid magic rejection | Yes | Yes | No | Pending CI | Unit test |
| Zero-tensor header rejection | Yes | Yes | No | Pending CI | Unit test |
| Bounded diagnostic log | Yes | Yes | No | Pending CI | 200-entry production limit |
| State-machine lifecycle | Yes | Yes | No | Pending CI | Unit test |
| Exact runtime asset presence and hashes | Yes | Yes | No | Pending CI | Build-time verification |
| GitHub Pages subdirectory paths | Yes | Yes | No | Pending CI | Production index rejects root asset paths |
| No required CDN/Hugging Face runtime URL | Yes | Yes | No | Pending CI | Static production scan |
| Real GGUF inference | Yes | No | No | Not run | Requires manual model test |

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

Status remains **Untested** until every relevant item is completed with a real model.

- [ ] Record phone model, Android version, Chrome version and physical RAM.
- [ ] Open the deployed GitHub Pages URL in Chrome for Android.
- [ ] Select the same 300–500 MB GGUF through the Android file picker.
- [ ] Load with one thread and a 1,024-token context.
- [ ] Confirm the interface remains responsive.
- [ ] Open and close the virtual keyboard.
- [ ] Rotate portrait to landscape and back without losing interface state.
- [ ] Generate streamed tokens.
- [ ] Record model-load duration, time to first token and tokens per second.
- [ ] Stop generation.
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
