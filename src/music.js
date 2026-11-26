const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const PITCH_LABELS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
const STRING_PITCHES = [4, 9, 2, 7, 11, 4];
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

export const FRETBOARD_TAB_ORDER = [5, 4, 3, 2, 1, 0];

const TEMPLATE = (id, label, category, degrees) => ({ id, label, category, degrees });

export const CHORD_TEMPLATES = [
  TEMPLATE('maj', '大三和弦', '基本和弦｜三和弦', ['1', '3', '5']),
  TEMPLATE('min', '小三和弦', '基本和弦｜三和弦', ['1', 'b3', '5']),
  TEMPLATE('aug', '增和弦', '基本和弦｜三和弦', ['1', '3', '#5']),
  TEMPLATE('dim', '減和弦', '基本和弦｜三和弦', ['1', 'b3', 'b5']),

  TEMPLATE('maj7', '大七和弦', '基本和弦｜七和弦', ['1', '3', '5', '7']),
  TEMPLATE('min7', '小七和弦', '基本和弦｜七和弦', ['1', 'b3', '5', 'b7']),
  TEMPLATE('7', '屬七和弦', '基本和弦｜七和弦', ['1', '3', '5', 'b7']),
  TEMPLATE('dim7', '減七和弦', '基本和弦｜七和弦', ['1', 'b3', 'b5', 'bb7']),
  TEMPLATE('m7b5', '半減和弦', '基本和弦｜七和弦', ['1', 'b3', 'b5', 'b7']),
  TEMPLATE('minMaj7', '小調大七和弦', '基本和弦｜七和弦', ['1', 'b3', '5', '7']),
  TEMPLATE('augMaj7', '大七升五和弦', '基本和弦｜七和弦', ['1', '3', '#5', '7']),

  TEMPLATE('6', '大六和弦', '基本和弦｜六和弦', ['1', '3', '5', '6']),
  TEMPLATE('m6', '小六和弦', '基本和弦｜六和弦', ['1', 'b3', '5', '6']),
  TEMPLATE('add9', '大調加九和弦', '基本和弦｜加九和弦', ['1', '3', '5', '9']),
  TEMPLATE('madd9', '小調加九和弦', '基本和弦｜加九和弦', ['1', 'b3', '5', '9']),
  TEMPLATE('sus2', '掛留二和弦', '基本和弦｜掛留和弦', ['1', '2', '5']),
  TEMPLATE('sus4', '掛留四和弦', '基本和弦｜掛留和弦', ['1', '4', '5']),
  TEMPLATE('7sus4', '屬七掛留四和弦', '基本和弦｜掛留和弦', ['1', '4', '5', 'b7']),
  TEMPLATE('69', '大調六九和弦', '基本和弦｜六九和弦', ['1', '3', '5', '6', '9']),
  TEMPLATE('m69', '小調六九和弦', '基本和弦｜六九和弦', ['1', 'b3', '5', '6', '9']),

  TEMPLATE('maj9', '大九和弦', '延伸和弦｜九和弦', ['1', '3', '5', '7', '9']),
  TEMPLATE('min9', '小九和弦', '延伸和弦｜九和弦', ['1', 'b3', '5', 'b7', '9']),
  TEMPLATE('9', '屬九和弦', '延伸和弦｜九和弦', ['1', '3', '5', 'b7', '9']),
  TEMPLATE('maj11', '大十一和弦', '延伸和弦｜十一和弦', ['1', '3', '5', '7', '9', '11']),
  TEMPLATE('min11', '小十一和弦', '延伸和弦｜十一和弦', ['1', 'b3', '5', 'b7', '9', '11']),
  TEMPLATE('11', '屬十一和弦', '延伸和弦｜十一和弦', ['1', '3', '5', 'b7', '9', '11']),
  TEMPLATE('maj13', '大十三和弦', '延伸和弦｜十三和弦', ['1', '3', '5', '7', '9', '11', '13']),
  TEMPLATE('min13', '小十三和弦', '延伸和弦｜十三和弦', ['1', 'b3', '5', 'b7', '9', '11', '13']),
  TEMPLATE('13', '屬十三和弦', '延伸和弦｜十三和弦', ['1', '3', '5', 'b7', '9', '11', '13']),

  TEMPLATE('7s9', '七加九和弦', '變化和弦', ['1', '3', '5', 'b7', '#9']),
  TEMPLATE('7b9', '七減九和弦', '變化和弦', ['1', '3', '5', 'b7', 'b9']),
  TEMPLATE('7b5s9', '七加九減五和弦', '變化和弦', ['1', '3', 'b5', 'b7', '#9']),
  TEMPLATE('7s5b9', '七減九加五和弦', '變化和弦', ['1', '3', '#5', 'b7', 'b9']),
  TEMPLATE('9s5', '九加五和弦', '變化和弦', ['1', '3', '#5', 'b7', '9']),
  TEMPLATE('9b5', '九減五和弦', '變化和弦', ['1', '3', 'b5', 'b7', '9']),
  TEMPLATE('7s5', '七加五和弦', '變化和弦', ['1', '3', '#5', 'b7']),
  TEMPLATE('m7s5', '小調七加五和弦', '變化和弦', ['1', 'b3', '#5', 'b7']),
  TEMPLATE('7b5', '七減五和弦', '變化和弦', ['1', '3', 'b5', 'b7']),
];

export const BASIC_TEMPLATE_IDS = [
  'maj', 'min', 'aug', 'dim',
  'maj7', 'min7', '7', 'dim7', 'm7b5', 'minMaj7', 'augMaj7',
  '6', 'm6', 'add9', 'madd9', 'sus2', 'sus4', '7sus4', '69', 'm69',
];

const TEMPLATE_BY_ID = new Map(CHORD_TEMPLATES.map((template) => [template.id, template]));
const SYMBOLS = {
  maj: '', min: 'm', aug: 'aug', dim: 'dim',
  maj7: 'maj7', min7: 'm7', 7: '7', dim7: 'dim7', m7b5: 'm7-5', minMaj7: 'mMaj7', augMaj7: 'maj7+5',
  6: '6', m6: 'm6', add9: 'add9', madd9: 'madd9', sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', 69: '6/9', m69: 'm6/9',
  maj9: 'maj9', 9: '9', min9: 'm9', maj11: 'maj11', 11: '11', min11: 'm11',
  maj13: 'maj13', 13: '13', min13: 'm13',
  '7s9': '7+9', '7b9': '7-9', '7b5s9': '7+9-5', '7s5b9': '7-9+5',
  '9s5': '9+5', '9b5': '9-5', '7s5': '7+5', 'm7s5': 'm7+5', '7b5': '7-5',
};

const DEGREE_SPECS = {
  1: [0, 0], 2: [2, 1], 3: [4, 2], 4: [5, 3], 5: [7, 4], 6: [9, 5], 7: [11, 6],
  9: [14, 8], 11: [17, 10], 13: [21, 12],
};

const DEGREE_LABELS = {
  1: '根音', 2: '大二度', b3: '小三度', 3: '大三度', 4: '完全四度',
  b5: '減五度', 5: '完全五度', '#5': '增五度', 6: '大六度',
  bb7: '減七度', b7: '小七度', 7: '大七度',
  b9: '小九度', 9: '大九度', '#9': '增九度', 11: '完全十一度', 13: '大十三度',
};

const INTERVAL_LABELS = {
  1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度', 5: '完全四度', 6: '增四度／減五度',
  7: '完全五度', 8: '小六度', 9: '大六度', 10: '小七度', 11: '大七度', 12: '完全八度',
};

export const ROOTS = LETTERS.flatMap((letter) => [letter, `${letter}#`, `${letter}b`]);

export function rootNamesForAccidentals(accidentals = ['natural', 'sharp', 'flat']) {
  const selected = new Set(accidentals);
  return ROOTS.filter((root) => (
    (root.endsWith('#') && selected.has('sharp'))
    || (root.endsWith('b') && selected.has('flat'))
    || (!root.endsWith('#') && !root.endsWith('b') && selected.has('natural'))
  ));
}

export function templateSymbol(templateId) {
  if (!TEMPLATE_BY_ID.has(templateId)) throw new Error(`找不到和弦類型：${templateId}`);
  return templateId === 'maj' ? 'maj' : SYMBOLS[templateId];
}

const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function parseNote(name) {
  const match = /^([A-G])((?:#|b){0,3})$/.exec(name ?? '');
  if (!match || /#.*b|b.*#/.test(match[2])) throw new Error(`無法辨識音名：${name}`);
  const accidental = [...match[2]].reduce((sum, symbol) => sum + (symbol === '#' ? 1 : -1), 0);
  return {
    letter: match[1],
    accidental,
    name: `${match[1]}${match[2]}`,
    pitchClass: modulo(NATURAL_PITCH[match[1]] + accidental, 12),
  };
}

function degreeSpec(token) {
  const match = /^(bb|b|#)?(1|2|3|4|5|6|7|9|11|13)$/.exec(token);
  if (!match) throw new Error(`無法辨識音程度數：${token}`);
  const [semitones, letterSteps] = DEGREE_SPECS[match[2]];
  const alteration = match[1] === 'bb' ? -2 : match[1] === 'b' ? -1 : match[1] === '#' ? 1 : 0;
  return { degree: token, semitones: semitones + alteration, letterSteps };
}

function accidentalName(value) {
  return value > 0 ? '#'.repeat(value) : 'b'.repeat(Math.abs(value));
}

function spellTone(root, token) {
  const rootNote = parseNote(root);
  const spec = degreeSpec(token);
  const letter = LETTERS[modulo(LETTERS.indexOf(rootNote.letter) + spec.letterSteps, LETTERS.length)];
  const pitchClass = modulo(rootNote.pitchClass + spec.semitones, 12);
  let accidental = pitchClass - NATURAL_PITCH[letter];
  while (accidental > 6) accidental -= 12;
  while (accidental < -6) accidental += 12;
  return { degree: token, letter, accidental, name: `${letter}${accidentalName(accidental)}`, pitchClass };
}

export function buildChord(root, templateId) {
  const template = TEMPLATE_BY_ID.get(templateId);
  if (!template) throw new Error(`找不到和弦類型：${templateId}`);
  parseNote(root);
  return {
    root,
    template,
    symbol: `${root}${SYMBOLS[templateId]}`,
    tones: template.degrees.map((degree) => spellTone(root, degree)),
  };
}

function wholeAndHalfDistance(semitones) {
  const wholeTones = Math.floor(semitones / 2);
  return semitones % 2
    ? wholeTones ? `${wholeTones} 全音＋1 半音` : '1 半音'
    : `${wholeTones} 全音`;
}

export function explainChordStack(chord) {
  const roles = chord.tones.map((tone) => {
    const spec = degreeSpec(tone.degree);
    return {
      degree: tone.degree,
      label: DEGREE_LABELS[tone.degree] ?? tone.degree,
      aboveRootOctave: spec.semitones >= 12,
    };
  });
  const steps = chord.tones.slice(1).map((tone, index) => {
    const previousTone = chord.tones[index];
    const semitones = degreeSpec(tone.degree).semitones - degreeSpec(previousTone.degree).semitones;
    return {
      from: previousTone.name,
      to: tone.name,
      interval: INTERVAL_LABELS[semitones] ?? `${semitones} 半音`,
      distance: wholeAndHalfDistance(semitones),
    };
  });
  return { steps, roles };
}

export function gradeNotes(expected, actual) {
  const actualNames = actual.map((value) => typeof value === 'string' ? value : `${value.letter}${accidentalName(value.accidental ?? 0)}`);
  const entries = expected.map((tone, index) => ({
    degree: tone.degree,
    expected: tone.name,
    actual: actualNames[index] ?? '',
    correct: tone.name === actualNames[index],
  }));
  return { correct: entries.length === actualNames.length && entries.every((entry) => entry.correct), entries };
}

export function guitarPitchAt(stringNumber, fret) {
  return modulo(STRING_PITCHES[6 - stringNumber] + fret, 12);
}

export function fretboardCells(chordNotes) {
  const targets = new Map(chordNotes.map((tone) => [tone.pitchClass, tone]));
  return STRING_NAMES.flatMap((stringName, stringIndex) => Array.from({ length: 12 }, (_, index) => {
    const fret = index + 1;
    const pitchClass = guitarPitchAt(6 - stringIndex, fret);
    const targetTone = targets.get(pitchClass) ?? null;
    return {
      stringIndex,
      stringName,
      fret,
      pitchClass,
      displayName: PITCH_LABELS[pitchClass],
      naturalName: PITCH_LABELS[pitchClass].includes('/') ? '' : PITCH_LABELS[pitchClass],
      targetTone,
      degree: targetTone?.degree ?? null,
      isRoot: targetTone?.degree === '1',
    };
  }));
}

export function randomQuestion(options = {}, previousKey = '', random = Math.random) {
  const rootNames = options.rootNames ?? ROOTS;
  const templateIds = options.templateIds ?? CHORD_TEMPLATES.map((template) => template.id);
  const candidates = rootNames.flatMap((root) => templateIds.map((templateId) => {
    const chord = buildChord(root, templateId);
    return { ...chord, key: `${root}:${templateId}`, templateId };
  })).filter((candidate) => candidate.tones.every((tone) => Math.abs(tone.accidental) <= 1));
  if (!candidates.length) throw new Error('目前設定沒有可出題的和弦');
  const available = candidates.filter((candidate) => candidate.key !== previousKey);
  const pool = available.length ? available : candidates;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length));
  return pool[index];
}
