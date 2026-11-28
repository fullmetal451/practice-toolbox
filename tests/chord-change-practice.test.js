import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { clampBpm, countInBeats, nextChordIndex, parseChordList, PRESETS, splitChordList } from '../changes/practice.js';
import { lookupChord } from '../voicings/catalog.js';

const database = JSON.parse(readFileSync(new URL('../voicings/guitar.json', import.meta.url), 'utf8'));

test('和弦組可用空白、逗號、頓號或直線分隔', () => {
  assert.deepEqual(splitChordList('C  G,Am、F | Dm→E7'), ['C', 'G', 'Am', 'F', 'Dm', 'E7']);
  assert.deepEqual(splitChordList('  '), []);
});

test('和弦組解析出和弦名稱，無法辨識的另外列出', () => {
  const { chords, invalid } = parseChordList('c g am F7 D/F# H x7');
  assert.deepEqual(chords.map(({ name }) => name), ['C', 'G', 'Am', 'F7', 'D/F#']);
  assert.deepEqual(invalid, ['H', 'x7']);
});

test('預設和弦組都能解析，而且每個和弦都有開放把位或第 1 格起的指法', () => {
  for (const preset of PRESETS) {
    const { chords, invalid } = parseChordList(preset);
    assert.deepEqual(invalid, [], preset);
    for (const chord of chords) {
      const { positions } = lookupChord(database, chord);
      assert.equal(positions[0]?.baseFret, 1, `${chord.name} in ${preset}`);
    }
  }
});

test('依序換和弦會繞回第一個', () => {
  const names = ['C', 'G', 'Am', 'F'];
  assert.deepEqual([0, 1, 2, 3].map((index) => nextChordIndex(index, names, false)), [1, 2, 3, 0]);
});

test('隨機換和弦不會連續出現同一個和弦', () => {
  const names = ['C', 'G', 'C', 'F'];
  for (const value of [0, 0.3, 0.6, 0.99]) {
    const next = nextChordIndex(0, names, true, () => value);
    assert.notEqual(names[next], 'C');
  }
  assert.equal(nextChordIndex(0, ['C', 'C'], true, () => 0), 1);
});

test('預備拍與速度範圍', () => {
  assert.deepEqual([1, 2, 3, 4, 6, 8].map(countInBeats), [4, 4, 3, 4, 3, 4]);
  assert.equal(clampBpm(10), 30);
  assert.equal(clampBpm(500), 200);
  assert.equal(clampBpm(Number.NaN), null);
});
