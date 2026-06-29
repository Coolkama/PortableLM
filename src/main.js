import './styles/main.css';
import { PortableLmProofApp } from './ui/app.js';

const moduleStartedAt = performance.now();
const app = new PortableLmProofApp({ moduleStartedAt });
app.start().catch((error) => {
  console.error('PortableLM failed to start.', error);
  const output = document.querySelector('#output');
  if (output) output.textContent = `PortableLM could not start: ${error instanceof Error ? error.message : String(error)}`;
});
