import assert from 'node:assert/strict';
import test from 'node:test';
import { ascending, buildScale, rootPosition, scaleNotes, scalePositions, SCALES, walkSequence } from '../scales/practice.js';

const names = ({ tones }) => tones.map(({ name }) => name).join(' ');

test('音階依度數拼出音名', () => {
  assert.equal(names(buildScale(0, 'major')), 'C D E F G A B');
  assert.equal(names(buildScale(9, 'minor')), 'A B C D E F G');
  assert.equal(names(buildScale(9, 'minorPentatonic')), 'A C D E G');
  assert.equal(names(buildScale(7, 'majorPentatonic')), 'G A B D E');
  assert.equal(names(buildScale(9, 'blues')), 'A C D Eb E G');
});

test('黑鍵主音選升降記號較少的寫法，不出現重升重降', () => {
  assert.equal(buildScale(1, 'major').root, 'Db');
  assert.equal(buildScale(1, 'minor').root, 'C#');
  assert.equal(buildScale(6, 'major').root, 'F#');
  assert.equal(buildScale(3, 'minor').root, 'Eb');
  assert.equal(buildScale(8, 'minor').root, 'G#');
  for (const { id } of SCALES) {
    for (let pitch = 0; pitch < 12; pitch++) {
      const { tones, root } = buildScale(pitch, id);
      assert.ok(tones.every(({ accidental }) => Math.abs(accidental) <= 1), `${root} ${id}`);
      assert.equal(new Set(tones.map(({ pitchClass }) => pitchClass)).size, tones.length);
    }
  }
});

test('指板上只標出音階內的音', () => {
  const notes = scaleNotes(buildScale(9, 'minorPentatonic').tones, 5, 8);
  const byString = (string) => notes.filter((note) => note.string === string).map(({ fret }) => fret);
  assert.deepEqual([6, 5, 4, 3, 2, 1].map(byString), [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
  assert.equal(scaleNotes(buildScale(4, 'minorPentatonic').tones).filter(({ fret }) => fret === 0).length, 6);
});

test('把位從第 6 弦的音階音起算，五聲音階 4 格、七聲音階 5 格，只列到第 12 格', () => {
  const pentatonic = scalePositions(buildScale(9, 'minorPentatonic'));
  assert.deepEqual(pentatonic.map(({ from, to }) => `${from}-${to}`), ['0-3', '3-6', '5-8', '8-11']);
  assert.deepEqual(scalePositions(buildScale(7, 'major')).map(({ from, to }) => `${from}-${to}`), ['0-4', '2-6', '3-7', '5-9', '7-11', '8-12']);
  assert.ok(scaleNotes(buildScale(4, 'major').tones).every(({ fret }) => fret <= 12));
});

test('預設把位從第 6 弦根音起；超過第 12 格就改從第 5 弦根音起', () => {
  const start = (pitch, id) => {
    const scale = buildScale(pitch, id);
    const positions = scalePositions(scale);
    return positions[rootPosition(positions, scale.tones)];
  };
  assert.equal(start(9, 'minorPentatonic').from, 5);
  assert.equal(start(7, 'major').from, 3);
  const d = start(2, 'minorPentatonic');
  assert.deepEqual([d.from, d.to], [5, 8]);
  for (const { id } of SCALES) {
    for (let pitch = 0; pitch < 12; pitch++) {
      const position = start(pitch, id);
      assert.ok(position && position.to <= 12, `${pitch} ${id}`);
      const roots = scaleNotes(buildScale(pitch, id).tones, position.from, position.to).filter(({ tone }) => tone.degree === '1');
      assert.ok(roots.some(({ string, fret }) => (string === 6 || string === 5) && fret === position.from), `${pitch} ${id}`);
    }
  }
});

test('跟拍走音由低到高、同音不重複，再走回來', () => {
  const g = buildScale(7, 'major');
  const up = ascending(scaleNotes(g.tones, 3, 7));
  assert.equal(up.map(({ tone }) => tone.name).join(' '), 'G A B C D E F# G A B C D E F# G A B');
  assert.ok(up.every((note, index) => !index || note.midi > up[index - 1].midi));
  const box = walkSequence(scaleNotes(buildScale(9, 'minorPentatonic').tones, 5, 8));
  assert.equal(box.length, 12 + 10);
  assert.deepEqual(box.slice(0, 3).map(({ string, fret }) => `${string}:${fret}`), ['6:5', '6:8', '5:5']);
  assert.deepEqual(box.slice(11, 13).map(({ string, fret }) => `${string}:${fret}`), ['1:8', '1:5']);
  assert.equal(box.at(-1).midi, box[1].midi);
});
