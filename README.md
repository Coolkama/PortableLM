# PortableLM — GitHub Pages build

PortableLM 1.6.4 prepared for static hosting on GitHub Pages.

The app loads version-pinned Markdown rendering, KaTeX and Wllama 3.5.1 runtime assets from jsDelivr. GGUF model data stays on the device and inference runs in the browser.

## Enable GitHub Pages

Open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

Site address: `https://coolkama.github.io/PortableLM/`

The first visit normally reloads once while the service worker takes control. Afterwards, **About PortableLM** should show `Secure context: true` and `Cross-origin isolated: true`, enabling multi-threaded CPU inference.

GGUF files are not included. Hugging Face downloads still depend on the current network allowing Hugging Face and its download CDN.
