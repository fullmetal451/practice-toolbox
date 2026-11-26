import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { chordSymbol, concertFrequency, lookupChord, parseChordQuery } from '../voicings/catalog.js';

const database = JSON.parse(readFileSync(new URL('../voicings/guitar.json', import.meta.url), 'utf8'));

test('辨識一般和弦、升降記號及帶指定低音的和弦', () => {
  assert.deepEqual(parseChordQuery(' Am7 '), { root: 'A', type: 'min7', bass: '' });
  assert.deepEqual(parseChordQuery('F♯m'), { root: 'F#', type: 'min', bass: '' });
  assert.deepEqual(parseChordQuery('D/F♯'), { root: 'D', type: 'maj', bass: 'F#' });
  assert.equal(chordSymbol(parseChordQuery('C6/9/E')), 'C6/9/E');
  assert.equal(chordSymbol(parseChordQuery('DbM7')), 'Dbmaj7');
  assert.equal(parseChordQuery('Hxyz'), null);
});

test('C 的開放把位對應正確格數、指法及試聽音高', () => {
  const result = lookupChord(database, parseChordQuery('C'));
  assert.deepEqual(result.tones, ['C', 'E', 'G']);
  const open = result.positions.find(({ positions }) => positions === '×–3–2–0–1–0');
  assert.ok(open);
  assert.deepEqual(open.strings.map(({ finger }) => finger), [0, 3, 2, 0, 1, 0]);
  assert.deepEqual(open.strings.map(({ midi }) => midi), [null, 48, 52, 55, 60, 64]);
  assert.equal(concertFrequency(69), 440);
});

test('比對指定低音時使用實際最低頻率，並保留原輸入的音名拼法', () => {
  for (const [symbol, pitch, name] of [['D/F#', 6, 'F#'], ['C/E', 4, 'E'], ['G/B', 11, 'B'], ['Am/G', 7, 'G']]) {
    const { positions } = lookupChord(database, parseChordQuery(symbol));
    assert.ok(positions.length, `${symbol} should have playable voicings`);
    assert.ok(positions.every(({ lowest, strings }) => (
      lowest.midi % 12 === pitch && lowest.name === name && lowest.midi === Math.min(...strings.flatMap(({ midi }) => midi ?? []))
    )));
  }
  assert.deepEqual(lookupChord(database, parseChordQuery('Db')).tones, ['D♭', 'F', 'A♭']);
});
