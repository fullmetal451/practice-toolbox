import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { build } from '../scripts/build-single-html.js';

const outputPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));

test('builds a non-empty single-file application without local runtime dependencies', async () => {
  await build();
  const html = await readFile(outputPath, 'utf8');
  assert.ok(html.length > 20_000);
  assert.doesNotMatch(html, /(?:href|src)="\.\.\/src\//);
  assert.doesNotMatch(html, /class="tool-nav/);
  assert.equal(html.includes('data-app-root'), true);
  assert.equal(html.includes('data-action="toggle-setup-fretboard"'), true);
  assert.equal(html.includes('data-mobile-key="bb"'), false);
  assert.equal(html.includes('class="fret-note target-note'), true);
  assert.equal(html.includes('root-note'), true);
  assert.equal(html.includes('class="target-dot"'), false);
  assert.equal(html.includes('repeat(12, minmax(0, 1fr))'), true);
  assert.equal(html.includes('音名僅標示自然音'), true);
  assert.equal(html.includes('construction-rule'), true);
  assert.equal(html.includes('explainChordStack'), true);
  assert.equal(html.includes("from './practice-config.js'"), false);
  assert.match(html, /function createDefaultPracticeConfig\(\)/);
  const script = html.match(/<script type="module">([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
