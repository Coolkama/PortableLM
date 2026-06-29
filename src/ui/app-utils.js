export function collectElements() {
  const ids = [
    'app-version', 'model-files', 'drop-zone', 'selection-summary', 'selected-files',
    'validation-message', 'context-length', 'load-model', 'cancel-load', 'unload-model',
    'model-state-badge', 'worker-state', 'stage-label', 'stage-detail', 'elapsed-time',
    'stalled-warning', 'continue-waiting', 'copy-diagnostics-warning', 'timings', 'prompt',
    'generate', 'stop-generation', 'clear-output', 'generation-state', 'output', 'copy-output',
    'diagnostics', 'copy-diagnostics', 'refresh-diagnostics',
  ];
  return Object.fromEntries(ids.map((id) => [camelCase(id), requiredElement(id)]));
}

function requiredElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required interface element #${id} is missing.`);
  return element;
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}

export function stageLabel(stage) {
  return {
    'starting-runtime': 'Starting local inference worker',
    'loading-model': 'Loading model and creating context',
  }[stage] ?? stage;
}

export function isBusy(state) {
  return ['validating', 'starting-runtime', 'loading-model', 'cancelling', 'unloading', 'generating'].includes(state);
}

export function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[<>]/g, '').slice(0, 2000);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(milliseconds) {
  if (milliseconds === null || milliseconds === undefined) return 'Not measured';
  if (milliseconds < 1000) return `${milliseconds.toFixed(0)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

export function calculateTokensPerSecond(tokens, firstTokenAt, finishedAt) {
  if (!Number.isFinite(tokens) || !firstTokenAt || finishedAt <= firstTokenAt) return null;
  return tokens / ((finishedAt - firstTokenAt) / 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
