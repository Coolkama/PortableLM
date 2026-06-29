const result = (status, value, detail = '') => ({ status, value, detail });

export async function probeCapabilities() {
  const capabilities = {
    userAgent: result('Reported', navigator.userAgent),
    protocol: result('Reported', location.protocol),
    secureContext: result('Reported', window.isSecureContext),
    crossOriginIsolated: result('Reported', window.crossOriginIsolated === true),
    logicalCores: result('Reported', navigator.hardwareConcurrency ?? 'Unknown'),
    serviceWorker: result(
      'Reported',
      'serviceWorker' in navigator,
      'Not registered during Milestone 1.',
    ),
    sharedArrayBuffer: result(
      typeof SharedArrayBuffer === 'function' ? 'Reported' : 'Not available',
      typeof SharedArrayBuffer === 'function',
    ),
    webAssembly: result(
      typeof WebAssembly === 'object' ? 'Reported' : 'Not available',
      typeof WebAssembly === 'object',
    ),
    wasmSimd: result('Untested', false),
    wasmSharedMemory: result('Untested', false),
    jspi: result(
      typeof WebAssembly?.Suspending === 'function' && typeof WebAssembly?.promising === 'function'
        ? 'Reported'
        : 'Not available',
      typeof WebAssembly?.Suspending === 'function' && typeof WebAssembly?.promising === 'function',
    ),
    memory64: result('Untested', 'Unknown', 'A reliable independent Memory64 probe is deferred.'),
    webGpu: result('Reported', 'gpu' in navigator, 'WebGPU is disabled for Milestone 1.'),
  };

  if (typeof WebAssembly === 'object') {
    try {
      const simdModule = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x08, 0x01, 0x06, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0x0b,
      ]);
      const valid = WebAssembly.validate(simdModule);
      capabilities.wasmSimd = result(valid ? 'Tested' : 'Failed', valid);
    } catch (error) {
      capabilities.wasmSimd = result('Failed', false, error instanceof Error ? error.message : String(error));
    }

    try {
      if (typeof SharedArrayBuffer !== 'function') throw new Error('SharedArrayBuffer is not available.');
      const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true });
      const valid = memory.buffer instanceof SharedArrayBuffer;
      capabilities.wasmSharedMemory = result(valid ? 'Tested' : 'Failed', valid);
    } catch (error) {
      capabilities.wasmSharedMemory = result('Failed', false, error instanceof Error ? error.message : String(error));
    }
  }

  return capabilities;
}
