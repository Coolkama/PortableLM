import {
  Wllama,
  WllamaAbortError,
  WllamaRuntimeError,
} from '@wllama/wllama/esm/index.js';

export class WllamaAdapter {
  #instance = null;
  #generationController = null;
  #loadCancelled = false;
  #operationId = 0;

  constructor({ baseUrl, log, onWorkerState = () => {} }) {
    this.baseUrl = baseUrl;
    this.log = log;
    this.onWorkerState = onWorkerState;
  }

  get loaded() {
    return this.#instance?.isModelLoaded() === true;
  }

  async #createInstance() {
    if (this.#instance) await this.unload();

    const defaultWasm = new URL('runtime/wllama/default/wllama.wasm', this.baseUrl).href;
    const compatWasm = new URL('runtime/wllama/compat/wllama.wasm', this.baseUrl).href;
    const compatWorkerUrl = new URL('runtime/wllama/compat/wllama.js', this.baseUrl).href;

    this.onWorkerState('starting');
    const workerResponse = await fetch(compatWorkerUrl, { cache: 'no-cache' });
    if (!workerResponse.ok) {
      throw new Error(`The local compatibility worker could not be read (${workerResponse.status}).`);
    }
    const compatWorkerCode = await workerResponse.text();

    const logger = {
      debug: (...args) => this.log.add('debug', formatLogArguments(args)),
      log: (...args) => this.log.add('info', formatLogArguments(args)),
      warn: (...args) => this.log.add('warning', formatLogArguments(args)),
      error: (...args) => this.log.add('error', formatLogArguments(args)),
    };

    const instance = new Wllama(
      { default: defaultWasm },
      {
        logger,
        allowOffline: false,
        parallelDownloads: 1,
        suppressNativeLog: false,
      },
    );

    // Explicit local compatibility assets prevent Wllama from using its CDN fallback.
    instance.setCompat({
      wasm: compatWasm,
      worker: { code: compatWorkerCode },
    });

    this.#instance = instance;
    return instance;
  }

  async load(files, { contextLength = 1024, threads = 1, onStage = () => {} } = {}) {
    const operationId = ++this.#operationId;
    this.#loadCancelled = false;

    onStage('starting-runtime', 'Preparing the local worker and vendored compatibility runtime.');
    const instance = await this.#createInstance();

    if (this.#loadCancelled || operationId !== this.#operationId) {
      await this.unload();
      throw createAbortError('Model loading was cancelled before the runtime started.');
    }

    onStage(
      'loading-model',
      'Initialising WebAssembly, allocating model memory, loading tensors and creating the context.',
    );
    this.onWorkerState('starting');

    try {
      await instance.loadModel(files, {
        n_threads: Math.max(1, Number(threads) || 1),
        n_ctx: Math.max(256, Number(contextLength) || 1024),
        n_batch: Math.min(256, Math.max(32, Number(contextLength) || 1024)),
        n_gpu_layers: 0,
        warmup: true,
        flash_attn: false,
      });

      if (this.#loadCancelled || operationId !== this.#operationId) {
        await this.unload();
        throw createAbortError('Model loading was cancelled.');
      }

      this.onWorkerState('active');
      const context = instance.getLoadedContextInfo();
      return {
        context,
        modelMetadata: instance.getModelMetadata(),
        chatTemplateAvailable: Boolean(instance.getChatTemplate()),
        multithread: instance.isMultithread(),
        threads: instance.getNumThreads(),
        webGpuActive: false,
      };
    } catch (error) {
      this.onWorkerState('failed');
      if (this.#loadCancelled || operationId !== this.#operationId) {
        await this.#safeExit();
        throw createAbortError('Model loading was cancelled.');
      }
      throw normaliseEngineError(error);
    }
  }

  async cancelLoad() {
    if (!this.#instance) return false;
    this.#loadCancelled = true;
    this.#operationId += 1;
    this.onWorkerState('stopping');
    try {
      await this.#instance.exit();
      this.#instance = null;
      this.onWorkerState('inactive');
      return true;
    } catch (error) {
      this.log.add('warning', 'The engine did not confirm model-load cancellation.', error);
      return false;
    }
  }

  async generate(prompt, { maxTokens = 128, onText = () => {}, onFirstText = () => {} } = {}) {
    if (!this.loaded) throw new Error('Load a model before generating text.');
    if (this.#generationController) throw new Error('A generation is already running.');

    const controller = new AbortController();
    this.#generationController = controller;
    let firstTextReported = false;
    let latestUsage = null;
    let latestTimings = null;
    let finishReason = null;

    const acceptText = (text, chunk) => {
      if (chunk?.usage) latestUsage = chunk.usage;
      if (chunk?.timings) latestTimings = chunk.timings;
      const choice = chunk?.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (!text) return;
      if (!firstTextReported) {
        firstTextReported = true;
        onFirstText();
      }
      onText(text);
    };

    try {
      const hasChatTemplate = Boolean(this.#instance.getChatTemplate());
      if (hasChatTemplate) {
        await this.#instance.createChatCompletion({
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          onData: (chunk) => acceptText(chunk.choices?.[0]?.delta?.content ?? '', chunk),
          abortSignal: controller.signal,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          min_p: 0.05,
          penalty_repeat: 1.1,
          timings_per_token: false,
        });
      } else {
        this.log.add('warning', 'No chat template was found; using raw completion mode.');
        await this.#instance.createCompletion({
          prompt,
          stream: true,
          onData: (chunk) => acceptText(chunk.choices?.[0]?.text ?? '', chunk),
          abortSignal: controller.signal,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          min_p: 0.05,
          penalty_repeat: 1.1,
        });
      }

      return {
        stopped: false,
        usage: latestUsage,
        timings: latestTimings,
        finishReason,
        outputStarted: firstTextReported,
      };
    } catch (error) {
      if (controller.signal.aborted || error instanceof WllamaAbortError || error?.name === 'AbortError') {
        return {
          stopped: true,
          usage: latestUsage,
          timings: latestTimings,
          finishReason: 'stopped-by-user',
          outputStarted: firstTextReported,
        };
      }
      throw normaliseEngineError(error);
    } finally {
      this.#generationController = null;
    }
  }

  stopGeneration() {
    if (!this.#generationController) return false;
    this.#generationController.abort();
    return true;
  }

  async unload() {
    this.stopGeneration();
    this.#loadCancelled = true;
    this.#operationId += 1;
    this.onWorkerState('stopping');
    await this.#safeExit();
    this.onWorkerState('inactive');
  }

  async #safeExit() {
    const instance = this.#instance;
    this.#instance = null;
    if (!instance) return;
    try {
      await instance.exit();
    } catch (error) {
      this.log.add('warning', 'Wllama reported an error while exiting.', error);
    }
  }
}

function normaliseEngineError(error) {
  if (error instanceof WllamaRuntimeError) {
    return new Error(`WebAssembly runtime failure: ${error.message}`, { cause: error });
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function createAbortError(message) {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
  }
}

function formatLogArguments(args) {
  return args
    .map((value) => {
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ')
    .slice(0, 4000);
}
