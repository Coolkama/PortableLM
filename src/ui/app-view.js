import { formatBytes, formatDuration, isBusy } from './app-utils.js';

const VERSION = typeof __PORTABLELM_VERSION__ === 'string' ? __PORTABLELM_VERSION__ : 'development';
const BUILD_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'development';

export function renderAll(app) {
  app.renderSelection();
  app.renderControls();
  app.renderStatus();
  app.renderMetrics();
  app.renderDiagnostics();
}

export function renderSelection(app) {
  const e = app.elements;
  e.selectedFiles.replaceChildren();
  for (const file of app.selectedFiles) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    const size = document.createElement('span');
    name.textContent = file.name;
    size.textContent = formatBytes(file.size);
    item.append(name, size);
    e.selectedFiles.append(item);
  }

  if (app.validation) {
    e.selectionSummary.hidden = false;
    e.selectionSummary.textContent = `${app.selectedFiles.length} file${app.selectedFiles.length === 1 ? '' : 's'} · ${formatBytes(app.validation.totalBytes)}${app.validation.split ? ' · split GGUF' : ''}`;
    const messages = [...app.validation.errors, ...app.validation.warnings];
    e.validationMessage.hidden = messages.length === 0;
    e.validationMessage.className = `message ${app.validation.valid ? 'warning-message' : 'error-message'}`;
    e.validationMessage.textContent = messages.join('\n');
  } else {
    e.selectionSummary.hidden = true;
    e.validationMessage.hidden = true;
  }
}

export function renderControls(app) {
  const state = app.state.value;
  const busy = isBusy(state);
  const loaded = state === 'ready' || state === 'generating';
  app.elements.modelFiles.disabled = busy || loaded;
  app.elements.contextLength.disabled = busy || loaded;
  app.elements.loadModel.disabled = !app.validation?.valid || busy || loaded;
  app.elements.cancelLoad.disabled = !['starting-runtime', 'loading-model'].includes(state);
  app.elements.unloadModel.disabled = state !== 'ready';
  app.elements.prompt.disabled = !loaded;
  app.elements.generate.disabled = state !== 'ready' || app.elements.prompt.value.trim().length === 0;
  app.elements.stopGeneration.disabled = state !== 'generating';
  app.elements.copyOutput.disabled = !app.elements.output.textContent || app.elements.output.textContent === 'No response yet.';
  app.elements.modelStateBadge.textContent = loaded ? 'Model loaded' : busy ? 'Working' : 'No model';
  app.elements.generationState.textContent = state === 'generating' ? 'Generating' : state === 'ready' ? 'Ready' : 'Not ready';
}

export function renderStatus(app) {
  const elapsed = Math.max(0, performance.now() - app.stageStartedAt);
  app.elements.stageLabel.textContent = app.stage;
  app.elements.stageDetail.textContent = app.stageDetail;
  app.elements.elapsedTime.textContent = `Elapsed: ${(elapsed / 1000).toFixed(1)} seconds`;
  app.elements.workerState.textContent = `Worker: ${app.workerStatus}`;
}

export function renderMetrics(app) {
  const rows = [
    ['Application startup', formatDuration(app.metrics.applicationStartupMs)],
    ['GGUF validation', formatDuration(app.metrics.validationMs)],
    ['WASM startup', app.metrics.wasmCompilationMs === null ? 'Included in model load; not separately observable' : formatDuration(app.metrics.wasmCompilationMs)],
    ['Model load + context', formatDuration(app.metrics.modelLoadMs)],
    ['Context creation', app.metrics.contextCreationMs === null ? 'Included in model load; not separately observable' : formatDuration(app.metrics.contextCreationMs)],
    ['Prompt evaluation', formatDuration(app.metrics.promptEvaluationMs)],
    ['Time to first token', formatDuration(app.metrics.timeToFirstTokenMs)],
    ['Generation', formatDuration(app.metrics.generationMs)],
    ['Completion tokens', app.metrics.completionTokens ?? 'Not reported'],
    ['Generation speed', app.metrics.tokensPerSecond === null ? 'Not reported' : `${app.metrics.tokensPerSecond.toFixed(2)} tokens/s`],
  ];
  app.elements.timings.replaceChildren();
  for (const [label, value] of rows) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = String(value);
    app.elements.timings.append(term, description);
  }
}

export function renderDiagnostics(app) {
  if (!app.elements) return;
  app.elements.diagnostics.textContent = app.diagnosticsText();
}

export function diagnosticsText(app) {
  return JSON.stringify(
    {
      portableLm: {
        version: VERSION,
        buildCommit: BUILD_COMMIT,
        milestone: 'v0.1-local-inference-proof candidate',
      },
      capabilities: app.capabilities,
      runtime: {
        engine: '@wllama/wllama 3.5.1',
        compatibilityEngine: '@wllama/wllama-compat 3.5.1',
        activeMode: app.modelInfo ? 'Worker-based single-thread CPU' : 'Not active',
        workerStatus: app.workerStatus,
        selectedThreads: 1,
        webGpu: 'Disabled',
        contextLength: Number(app.elements?.contextLength?.value ?? 1024),
      },
      model: {
        filenames: app.selectedFiles.map((file) => file.name),
        totalBytes: app.validation?.totalBytes ?? 0,
        splitFileCount: app.validation?.split ? app.selectedFiles.length : 0,
        basicValidation: app.validation
          ? { valid: app.validation.valid, errors: app.validation.errors, warnings: app.validation.warnings, headers: app.validation.headers }
          : null,
        loadedContext: app.modelInfo?.context ?? null,
        chatTemplateAvailable: app.modelInfo?.chatTemplateAvailable ?? null,
      },
      operation: {
        state: app.state.value,
        stage: app.stage,
        stageElapsedMs: Math.round(performance.now() - app.stageStartedAt),
        metrics: app.metrics,
        lastGeneration: app.generationResult
          ? {
              stopped: app.generationResult.stopped,
              finishReason: app.generationResult.finishReason,
              usage: app.generationResult.usage,
              timings: app.generationResult.timings,
            }
          : null,
      },
      logs: app.log.toArray().slice(-50),
      privacy: 'Prompt text, response text and model contents are intentionally omitted.',
    },
    null,
    2,
  );
}

export function setOutput(app, text) {
  app.elements.output.textContent = text;
  app.renderControls();
}
