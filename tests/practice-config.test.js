import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultPracticeConfig } from '../src/practice-config.js';

test('starts new practice settings in forward mode with natural roots only', () => {
  const config = createDefaultPracticeConfig();

  assert.equal(config.mode, 'forward');
  assert.deepEqual(config.rootAccidentals, ['natural']);
});

test('creates independent default root selections for each fresh configuration', () => {
  const first = createDefaultPracticeConfig();
  first.rootAccidentals.push('sharp');

  assert.deepEqual(createDefaultPracticeConfig().rootAccidentals, ['natural']);
});
