import assert from 'node:assert/strict';
import test from 'node:test';
import { guitarPitchAt } from '../src/music.js';
import { answerPitches, fretboardPositions, pitchName, shufflePositions } from '../fretboard/practice.js';

test('吉他每根弦的空弦與第 12、24 格具有相同的音名', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((string) => pitchName(guitarPitchAt(string, 0))), ['E', 'B', 'G', 'D', 'A', 'E']);
  for (const string of [1, 2, 3, 4, 5, 6]) {
    assert.equal(guitarPitchAt(string, 12), guitarPitchAt(string, 0));
    assert.equal(guitarPitchAt(string, 24), guitarPitchAt(string, 0));
  }
  assert.equal(pitchName(guitarPitchAt(5, 9)), 'F♯ / G♭');
  assert.equal(pitchName(guitarPitchAt(5, 9), 'solfege'), 'Fa♯ / Sol♭');
});

test('題庫符合所選弦、格數與自然音設定', () => {
  const config = { strings: [5], from: 0, to: 3, naturalOnly: true };
  assert.deepEqual(fretboardPositions(config).map(({ fret, pitch }) => [fret, pitchName(pitch)]), [[0, 'A'], [2, 'B'], [3, 'C']]);
  assert.deepEqual(fretboardPositions({ ...config, to: 0 }), [{ stringNumber: 5, fret: 0, pitch: 9 }]);
  assert.deepEqual(fretboardPositions({ ...config, from: 4 }), []);
  assert.deepEqual(fretboardPositions({ ...config, strings: [] }), []);
  assert.equal(answerPitches(true).length, 7);
  assert.equal(answerPitches(false).length, 12);
});

test('重洗題庫不遺漏題目且會避開上一題', () => {
  const pool = fretboardPositions({ strings: [1], from: 0, to: 3, naturalOnly: false });
  const previous = pool.at(-1);
  const deck = shufflePositions(pool, previous, () => 0.999);
  assert.deepEqual(new Set(deck), new Set(pool));
  assert.notEqual(deck.at(-1), previous);
  assert.deepEqual(shufflePositions([previous], previous), [previous]);
});
