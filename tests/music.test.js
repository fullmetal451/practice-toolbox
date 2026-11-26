import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASIC_TEMPLATE_IDS,
  CHORD_TEMPLATES,
  FRETBOARD_TAB_ORDER,
  buildChord,
  fretboardCells,
  gradeNotes,
  randomQuestion,
  rootNamesForAccidentals,
  templateSymbol,
} from '../src/music.js';
import * as music from '../src/music.js';

test('spells augmented and extended chords with their theoretical notes', () => {
  assert.deepEqual(
    buildChord('C', 'aug').tones.map((tone) => tone.name),
    ['C', 'E', 'G#'],
  );
  assert.deepEqual(
    buildChord('C', '13').tones.map((tone) => tone.name),
    ['C', 'E', 'G', 'Bb', 'D', 'F', 'A'],
  );
  assert.deepEqual(
    buildChord('Cb', 'maj7').tones.map((tone) => tone.name),
    ['Cb', 'Eb', 'Gb', 'Bb'],
  );
});

test('grades the spelled answer rather than its enharmonic pitch only', () => {
  const expected = buildChord('C', 'aug').tones;
  assert.equal(gradeNotes(expected, ['C', 'E', 'G#']).correct, true);
  assert.equal(gradeNotes(expected, ['C', 'E', 'Ab']).correct, false);
});

test('follows the reference-table chord taxonomy and standard templates', () => {
  const ids = new Set(CHORD_TEMPLATES.map((template) => template.id));
  for (const id of ['maj', 'min', 'aug', 'dim', 'sus2', 'sus4', '7sus4', '6', 'm6', '69', 'm69', 'add9', 'madd9', 'maj7', 'min7', '7', 'dim7', 'm7b5', 'minMaj7', 'augMaj7', 'maj9', 'min9', '9', 'maj11', 'min11', '11', 'maj13', 'min13', '13', '7s9', '7b9', '7b5s9', '7s5b9', '9s5', '9b5', '7s5', 'm7s5', '7b5']) {
    assert.equal(ids.has(id), true, `missing ${id}`);
  }
  for (const id of ['power5', 'add2', 'add4', 'aug7', '7sus2', '7s11', '13s11']) {
    assert.equal(ids.has(id), false, `should not include ${id}`);
  }
});

test('uses every reference-table basic chord as the default set', () => {
  assert.deepEqual(BASIC_TEMPLATE_IDS, [
    'maj', 'min', 'aug', 'dim',
    'maj7', 'min7', '7', 'dim7', 'm7b5', 'minMaj7', 'augMaj7',
    '6', 'm6', 'add9', 'madd9', 'sus2', 'sus4', '7sus4', '69', 'm69',
  ]);
});

test('spells the two reference-table templates newly added to the pool', () => {
  assert.deepEqual(buildChord('C', 'm69').tones.map((tone) => tone.name), ['C', 'Eb', 'G', 'A', 'D']);
  assert.deepEqual(buildChord('C', 'm7s5').tones.map((tone) => tone.name), ['C', 'Eb', 'G#', 'Bb']);
});

test('describes a seventh chord by the intervals between adjacent chord tones', () => {
  const explanation = music.explainChordStack?.(buildChord('C', 'maj7')) ?? { steps: [], roles: [] };

  assert.deepEqual(explanation.steps, [
    { from: 'C', to: 'E', interval: '大三度', distance: '2 全音' },
    { from: 'E', to: 'G', interval: '小三度', distance: '1 全音＋1 半音' },
    { from: 'G', to: 'B', interval: '大三度', distance: '2 全音' },
  ]);
  assert.deepEqual(explanation.roles, [
    { degree: '1', label: '根音', aboveRootOctave: false },
    { degree: '3', label: '大三度', aboveRootOctave: false },
    { degree: '5', label: '完全五度', aboveRootOctave: false },
    { degree: '7', label: '大七度', aboveRootOctave: false },
  ]);
});

test('marks an added ninth as an upper-octave chord tone while keeping the adjacent interval', () => {
  const explanation = music.explainChordStack?.(buildChord('C', 'add9')) ?? { steps: [], roles: [] };

  assert.deepEqual(explanation.steps.at(-1), {
    from: 'G', to: 'D', interval: '完全五度', distance: '3 全音＋1 半音',
  });
  assert.deepEqual(explanation.roles.at(-1), {
    degree: '9', label: '大九度', aboveRootOctave: true,
  });
});

test('formats internal template identifiers as conventional chord symbols', () => {
  assert.equal(templateSymbol('maj'), 'maj');
  assert.equal(templateSymbol('sus2'), 'sus2');
  assert.equal(templateSymbol('7s9'), '7+9');
  assert.equal(templateSymbol('m7s5'), 'm7+5');
});

test('maps every six-string fretboard position with natural-note reference labels', () => {
  const cells = fretboardCells(buildChord('C', 'aug').tones);
  assert.equal(cells.length, 72);
  assert.equal(cells.some((cell) => cell.fret === 0), false);
  assert.equal(cells.some((cell) => cell.fret === 12), true);
  assert.equal(cells.some((cell) => cell.naturalName === ''), true);
  assert.equal(cells.some((cell) => cell.targetTone?.name === 'G#' && cell.degree === '#5'), true);
  assert.equal(cells.some((cell) => cell.targetTone?.name === 'C' && cell.isRoot), true);
  assert.equal(cells.some((cell) => cell.targetTone?.name === 'G#' && cell.isRoot), false);
});

test('orders the visual fretboard from high E to low E like TAB notation', () => {
  assert.deepEqual(FRETBOARD_TAB_ORDER, [5, 4, 3, 2, 1, 0]);
});

test('does not immediately repeat the preceding generated question', () => {
  const next = randomQuestion(
    { rootNames: ['C', 'D'], templateIds: ['maj'] },
    'C:maj',
    () => 0,
  );
  assert.equal(next.key, 'D:maj');
});

test('filters chord roots by selected natural, sharp, and flat spellings', () => {
  assert.deepEqual(rootNamesForAccidentals(['natural']), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.deepEqual(rootNamesForAccidentals(['sharp']), ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#']);
  assert.deepEqual(rootNamesForAccidentals(['flat']), ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']);
  assert.deepEqual(rootNamesForAccidentals(['natural', 'flat']), ['C', 'Cb', 'D', 'Db', 'E', 'Eb', 'F', 'Fb', 'G', 'Gb', 'A', 'Ab', 'B', 'Bb']);
});

test('generates only chord spellings that need at most one sharp or flat', () => {
  const question = randomQuestion(
    { rootNames: ['C', 'C#'], templateIds: ['aug'] },
    '',
    () => 0.99,
  );
  assert.equal(question.root, 'C');
  assert.equal(question.tones.every((tone) => Math.abs(tone.accidental) <= 1), true);
});
