# PortableLM

PortableLM is being rebuilt from scratch as a static, offline-first browser application for running local GGUF language models. This branch contains **Milestone 1 only**: the smallest practical proof of local model selection, loading and token generation.

The application is designed for GitHub Pages and has no backend. The Wllama JavaScript runtime, worker code and WebAssembly files are installed from exact npm versions during the build, copied into the site, hashed and verified. The running application does not require Hugging Face, a CDN, an API service, analytics or telemetry.

## Milestone 1 features

- Local single-file GGUF selection
- Multi-file selection for llama.cpp-style split GGUF names
- Basic bounded header validation before loading
- Worker-based Wllama inference
- One CPU thread
- WebGPU explicitly disabled
- 512, 1,024 or 2,048 token context selection
- Streaming text output
- Stop generation
- Model unload and reload
- Honest named loading stages and elapsed time
- A warning after 30 seconds without a new stage or token
- Copyable diagnostics with bounded logs
- No prompt text or response text in diagnostics
- No required runtime network request beyond the GitHub Pages application itself

## What this milestone does not claim

No platform has yet been manually verified with a real model through this new build. Chrome, Edge and Chrome for Android remain **Untested** until the manual acceptance checklist is completed. In particular, the presence of WebAssembly APIs is not treated as proof that a model will load.

This milestone does not yet provide multiple chats, persisted history, Markdown, mathematics, a complete PWA, WebGPU, Hugging Face access or API mode.

## Build

Requirements:

- Node.js 22
- npm 10 or later

```bash
npm ci
npm run vendor:runtime
npm run verify:assets
npm test
npm run build
npm run test:dist
```

The production site is written to `dist/`. Vite uses relative asset paths so the same build works from a GitHub Pages project subdirectory.

## Run locally

```bash
npm ci
npm run vendor:runtime
npm run dev
```

Open the local Vite URL in Chrome or Edge. Local development may use HTTP because Milestone 1 deliberately uses one thread and does not depend on cross-origin isolation.

## Load a model

1. Open PortableLM.
2. Choose a local `.gguf` file. For a split model, choose every `-00001-of-000NN.gguf` part together.
3. Check the displayed filenames and total size.
4. Select a conservative context length; 1,024 is the initial target.
5. Choose **Load model**.
6. Wait for **Model ready** or a clear error.
7. Enter a short prompt and choose **Generate**.
8. Use **Stop generation** or **Unload model** as required.

A `.gguf` extension and readable header do not guarantee that the architecture, quantisation or metadata are supported by the pinned engine.

## Privacy

In this local mode PortableLM does not intentionally upload the selected model, prompt, output or diagnostics. Browser extensions, a compromised browser, operating-system access and modified site code remain outside that guarantee. Review the deployed source and asset hashes when using PortableLM in a sensitive environment.

## Wllama versions

- `@wllama/wllama` `3.5.1`
- `@wllama/wllama-compat` `3.5.1`

The build imports the explicit `@wllama/wllama/esm/index.js` path because the 3.5.1 package's declared root `main` file is not present in the npm archive. This is verified by the production build rather than hidden behind a floating package version.

## GitHub Pages

The included workflow installs exact dependencies, vendors and verifies runtime assets, runs tests, builds the static site and deploys `dist/`. On the Milestone 1 branch it also commits the generated Wllama assets and hash manifest so the repository records the exact runtime used.

## Manual acceptance

See [MILESTONE_1_TESTS.md](MILESTONE_1_TESTS.md). Development must stop before Milestone 2 until a real 300–500 MB model has passed on desktop Chrome or Edge and Chrome for Android.
