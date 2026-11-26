import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appPath = fileURLToPath(new URL('../src/app.js', import.meta.url));
const stylesPath = fileURLToPath(new URL('../src/styles.css', import.meta.url));

test('separates session controls, chord selection, and the start summary in the setup view', async () => {
  const [app, styles] = await Promise.all([readFile(appPath, 'utf8'), readFile(stylesPath, 'utf8')]);

  assert.match(app, /class="setup-intro"/);
  assert.match(app, /class="setup-layout"/);
  assert.match(app, /class="setup-controls"/);
  assert.match(app, /class="chord-selector"/);
  assert.match(app, /class="selection-summary /);
  assert.match(styles, /\.setup-layout\s*\{[^}]*grid-template-columns:/s);
  assert.match(styles, /@media \(max-width: 900px\)\s*\{[\s\S]*?\.setup-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test('offers root accidental filters and passes them to question generation', async () => {
  const app = await readFile(appPath, 'utf8');

  assert.match(app, /class="root-accidental-check"/);
  assert.match(app, /rootNamesForAccidentals\(state\.config\.rootAccidentals\)/);
});
