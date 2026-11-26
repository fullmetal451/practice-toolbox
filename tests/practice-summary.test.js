import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appPath = fileURLToPath(new URL('../src/app.js', import.meta.url));

test('renders a question-count setting, answer formula, and settlement view', async () => {
  const app = await readFile(appPath, 'utf8');

  assert.match(app, /id="question-count"/);
  assert.match(app, /class="formula-strip"/);
  assert.match(app, /function renderSummary\(/);
  assert.match(app, /data-action="summary"/);
});
