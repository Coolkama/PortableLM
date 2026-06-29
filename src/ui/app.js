import { probeCapabilities } from '../diagnostics/capabilities.js';
import { RingLog } from '../diagnostics/ring-log.js';
import { WllamaAdapter } from '../inference/wllama-adapter.js';
import { validateGgufSelection } from '../models/gguf-validator.js';
import { LoadState } from '../state/load-state.js';
import {
  calculateTokensPerSecond,
  collectElements,
  copyText,
  isBusy,
  safeError,
  stageLabel,
} from './app-utils.js';
import {
  diagnosticsText as buildDiagnosticsText,
  renderAll as renderAllView,
  renderControls as renderControlsView,
  renderDiagnostics as renderDiagnosticsView,
  renderMetrics as renderMetricsView,
  renderSelection as renderSelectionView,
  renderStatus as renderStatusView,
  setOutput as setOutputView,
} from './app-view.js';

const VERSION = typeof __PORTABLELM_VERSION__ === 'string' ? __PORTABLELM_VERSION__ : 'development';
export class PortableLmProofApp {
  constructor({ moduleStartedAt }) {
    this.moduleStartedAt = moduleStartedAt;
    this.state = new LoadState();
    this.log = new RingLog(200);
    this.capabilities = {};
    this.validation = null;
    this.selectedFiles = [];
    this.workerStatus = 'inactive';
    this.stage = 'Waiting for a model';
    this.stageDetail = 'Single-thread CPU mode · WebGPU disabled';
    this.stageStartedAt = performance.now();
    this.lastEngineEventAt = performance.now();
    this.waitWarningDismissedAt = 0;
    this.metrics = {
      applicationStartupMs: null,
      validationMs: null,
      runtimeStartupMs: null,
      wasmCompilationMs: null,
      modelLoadMs: null,
      contextCreationMs: null,
      promptEvaluationMs: null,
      timeToFirstTokenMs: null,
      generationMs: null,
      completionTokens: null,
      tokensPerSecond: null,
    };
    this.modelInfo = null;
    this.generationResult = null;
    this.loadStartedAt = null;
    this.generationStartedAt = null;
    this.firstTokenAt = null;

    const baseUrl = new URL(import.meta.env.BASE_URL, document.baseURI);
    this.engine = new WllamaAdapter({
      baseUrl,
      log: this.log,
      onWorkerState: (status) => {
        this.workerStatus = status;
        this.lastEngineEventAt = performance.now();
        this.renderStatus();
        this.renderDiagnostics();
      },
    });
  }

  async start() {
    this.elements = collectElements();
    this.elements.appVersion.textContent = `v${VERSION}`;
    this.bindEvents();
    this.capabilities = await probeCapabilities();
    this.metrics.applicationStartupMs = performance.now() - this.moduleStartedAt;
    this.log.add('info', 'PortableLM Milestone 1 interface started.');
    this.state.subscribe(() => this.renderControls());
    this.renderAll();
    this.timer = window.setInterval(() => this.tick(), 250);
    window.addEventListener('beforeunload', () => this.engine.stopGeneration());
  }

  bindEvents() {
    const e = this.elements;
    e.modelFiles.addEventListener('change', () => this.handleFiles(e.modelFiles.files));
    e.dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      e.dropZone.classList.add('dragging');
    });
    e.dropZone.addEventListener('dragleave', () => e.dropZone.classList.remove('dragging'));
    e.dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      e.dropZone.classList.remove('dragging');
      this.handleFiles(event.dataTransfer?.files ?? []);
    });
    e.loadModel.addEventListener('click', () => this.loadModel());
    e.cancelLoad.addEventListener('click', () => this.cancelLoad());
    e.unloadModel.addEventListener('click', () => this.unloadModel());
    e.prompt.addEventListener('input', () => this.renderControls());
    e.generate.addEventListener('click', () => this.generate());
    e.stopGeneration.addEventListener('click', () => this.stopGeneration());
    e.clearOutput.addEventListener('click', () => this.setOutput('No response yet.'));
    e.copyOutput.addEventListener('click', () => copyText(e.output.textContent));
    e.copyDiagnostics.addEventListener('click', () => copyText(this.diagnosticsText()));
    e.copyDiagnosticsWarning.addEventListener('click', () => copyText(this.diagnosticsText()));
    e.refreshDiagnostics.addEventListener('click', async () => {
      this.capabilities = await probeCapabilities();
      this.log.add('info', 'Runtime probes refreshed.');
      this.renderDiagnostics();
    });
    e.continueWaiting.addEventListener('click', () => {
      this.waitWarningDismissedAt = performance.now();
      this.lastEngineEventAt = performance.now();
      e.stalledWarning.hidden = true;
    });
  }

  async handleFiles(fileList) {
    if (isBusy(this.state.value) || this.engine.loaded) return;
    const files = [...fileList];
    this.state.transition('validating');
    this.setStage('Validating selected files', 'Reading only the bounded GGUF header from each selected file.');
    const startedAt = performance.now();
    this.validation = await validateGgufSelection(files);
    this.metrics.validationMs = performance.now() - startedAt;
    this.selectedFiles = this.validation.files;
    this.state.transition(this.validation.valid ? 'idle' : 'failed');
    this.log.add(
      this.validation.valid ? 'info' : 'warning',
      this.validation.valid ? 'GGUF selection passed basic validation.' : 'GGUF selection failed validation.',
      { errors: this.validation.errors, warnings: this.validation.warnings },
    );
    this.setStage(
      this.validation.valid ? 'Files validated' : 'Validation failed',
      this.validation.valid
        ? 'The header is readable. Full model compatibility is checked only when Wllama loads it.'
        : 'Correct the selected files before loading.',
    );
    this.renderAll();
  }

  async loadModel() {
    if (!this.validation?.valid || isBusy(this.state.value)) return;
    this.state.transition('starting-runtime');
    this.modelInfo = null;
    this.generationResult = null;
    this.loadStartedAt = performance.now();
    this.metrics.modelLoadMs = null;
    this.metrics.runtimeStartupMs = null;
    this.metrics.wasmCompilationMs = null;
    this.metrics.contextCreationMs = null;
    this.setOutput('Model loading. No prompt has been sent.');
    this.log.add('info', 'Model loading requested.', {
      files: this.selectedFiles.map((file) => file.name),
      totalBytes: this.validation.totalBytes,
      threads: 1,
      contextLength: Number(this.elements.contextLength.value),
    });

    try {
      const result = await this.engine.load(this.selectedFiles, {
        contextLength: Number(this.elements.contextLength.value),
        threads: 1,
        onStage: (stage, detail) => {
          if (stage === 'loading-model' && this.state.value === 'starting-runtime') {
            this.state.transition('loading-model');
          }
          this.setStage(stageLabel(stage), detail);
        },
      });
      this.metrics.modelLoadMs = performance.now() - this.loadStartedAt;
      this.modelInfo = result;
      this.state.transition('ready');
      this.setStage(
        'Model ready',
        `${result.multithread ? 'Multi-thread' : 'Single-thread'} CPU runtime · ${result.threads} thread${result.threads === 1 ? '' : 's'} · WebGPU disabled`,
      );
      this.log.add('info', 'Model loaded successfully.', {
        context: result.context,
        chatTemplateAvailable: result.chatTemplateAvailable,
      });
      this.setOutput('Model ready. Enter a prompt to prove local generation.');
    } catch (error) {
      const cancelled = error?.name === 'AbortError';
      if (this.state.value === 'cancelling' || cancelled) {
        this.state.transition('idle');
        this.setStage('Loading cancelled', 'The runtime has been stopped. Select Load model to try again.');
        this.setOutput('Model loading was cancelled.');
        this.log.add('warning', 'Model loading was cancelled.');
      } else {
        this.state.transition('failed');
        this.setStage('Model load failed', safeError(error));
        this.setOutput(`Model load failed: ${safeError(error)}`);
        this.log.add('error', 'Model load failed.', error);
      }
    } finally {
      this.renderAll();
    }
  }

  async cancelLoad() {
    if (!['starting-runtime', 'loading-model'].includes(this.state.value)) return;
    this.state.transition('cancelling');
    this.setStage(
      'Cancellation requested',
      'PortableLM has asked the worker to exit. Wllama does not expose a dedicated load AbortSignal.',
    );
    this.log.add('warning', 'Model-load cancellation requested.');
    const confirmed = await this.engine.cancelLoad();
    if (this.state.value === 'cancelling' && confirmed) {
      this.state.transition('idle');
      this.setStage('Loading cancelled', 'The worker confirmed that it exited.');
      this.setOutput('Model loading was cancelled.');
    }
    this.renderAll();
  }

  async unloadModel() {
    if (this.state.value !== 'ready') return;
    this.state.transition('unloading');
    this.setStage('Unloading model', 'Stopping the worker and releasing browser references.');
    await this.engine.unload();
    this.modelInfo = null;
    this.state.transition('idle');
    this.setStage('Model unloaded', 'The browser may return released memory to the operating system later.');
    this.setOutput('Model unloaded. You can load the selected model again.');
    this.log.add('info', 'Model unloaded.');
    this.renderAll();
  }

  async generate() {
    const prompt = this.elements.prompt.value.trim();
    if (this.state.value !== 'ready' || !prompt) return;
    this.state.transition('generating');
    this.generationStartedAt = performance.now();
    this.firstTokenAt = null;
    this.generationResult = null;
    this.metrics.promptEvaluationMs = null;
    this.metrics.timeToFirstTokenMs = null;
    this.metrics.generationMs = null;
    this.metrics.completionTokens = null;
    this.metrics.tokensPerSecond = null;
    this.setOutput('');
    this.setStage('Evaluating prompt', 'Preparing the prompt and evaluating it inside the local worker.');
    this.log.add('info', 'Local generation started.', { promptCharacters: prompt.length, maxTokens: 128 });

    try {
      const result = await this.engine.generate(prompt, {
        maxTokens: 128,
        onFirstText: () => {
          this.firstTokenAt = performance.now();
          this.metrics.timeToFirstTokenMs = this.firstTokenAt - this.generationStartedAt;
          this.metrics.promptEvaluationMs = this.metrics.timeToFirstTokenMs;
          this.setStage('Generating response', 'Streaming text from the local inference worker.');
        },
        onText: (text) => {
          this.elements.output.textContent += text;
          this.elements.copyOutput.disabled = this.elements.output.textContent.length === 0;
          this.lastEngineEventAt = performance.now();
        },
      });

      const finishedAt = performance.now();
      this.metrics.generationMs = finishedAt - this.generationStartedAt;
      this.metrics.completionTokens = result.usage?.completion_tokens ?? result.timings?.predicted_n ?? null;
      this.metrics.tokensPerSecond = result.timings?.predicted_per_second ?? calculateTokensPerSecond(
        this.metrics.completionTokens,
        this.firstTokenAt,
        finishedAt,
      );
      this.generationResult = result;
      this.state.transition('ready');
      this.setStage(
        result.stopped ? 'Generation stopped' : 'Generation complete',
        result.stopped ? 'The model remains loaded and ready.' : `Finish reason: ${result.finishReason ?? 'reported as complete'}.`,
      );
      if (!this.elements.output.textContent) {
        this.setOutput(result.stopped ? 'Generation stopped before any text was emitted.' : 'The model emitted no text.');
      }
      this.log.add('info', result.stopped ? 'Generation stopped by the user.' : 'Generation completed.', {
        usage: result.usage,
        timings: result.timings,
        finishReason: result.finishReason,
      });
    } catch (error) {
      this.state.transition('ready');
      this.setStage('Generation failed', safeError(error));
      this.setOutput(`${this.elements.output.textContent}\n\nGeneration failed: ${safeError(error)}`.trim());
      this.log.add('error', 'Generation failed.', error);
    } finally {
      this.renderAll();
    }
  }

  stopGeneration() {
    if (this.state.value !== 'generating') return;
    if (this.engine.stopGeneration()) {
      this.setStage('Stopping generation', 'Waiting for the local worker to acknowledge cancellation.');
      this.log.add('warning', 'Generation cancellation requested.');
    }
  }

  setStage(label, detail) {
    this.stage = label;
    this.stageDetail = detail;
    this.stageStartedAt = performance.now();
    this.lastEngineEventAt = performance.now();
    this.elements?.stalledWarning && (this.elements.stalledWarning.hidden = true);
    this.renderStatus();
    this.renderDiagnostics();
  }

  tick() {
    this.renderStatus();
    if (isBusy(this.state.value) && performance.now() - this.lastEngineEventAt >= 30_000) {
      if (this.waitWarningDismissedAt < this.lastEngineEventAt) {
        this.elements.stalledWarning.hidden = false;
      }
    }
  }

  renderAll() { return renderAllView(this); }
  renderSelection() { return renderSelectionView(this); }
  renderControls() { return renderControlsView(this); }
  renderStatus() { return renderStatusView(this); }
  renderMetrics() { return renderMetricsView(this); }
  renderDiagnostics() { return renderDiagnosticsView(this); }
  diagnosticsText() { return buildDiagnosticsText(this); }
  setOutput(text) { return setOutputView(this, text); }
}
