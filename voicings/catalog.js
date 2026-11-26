import { buildChord, CHORD_TEMPLATES, parseNote, templateSymbol } from '../src/music.js';

const DATA_KEYS = ['C', 'Csharp', 'D', 'Eb', 'E', 'F', 'Fsharp', 'G', 'Ab', 'A', 'Bb', 'B'];
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const TYPE_KEYS = {
  maj: 'major', min: 'minor', 7: '7', maj7: 'maj7', min7: 'm7',
  sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', add9: 'add9', madd9: 'madd9',
  6: '6', m6: 'm6', 69: '69', m69: 'm69', dim: 'dim', dim7: 'dim7', m7b5: 'm7b5', aug: 'aug',
  minMaj7: 'mmaj7', augMaj7: 'maj7#5', maj9: 'maj9', min9: 'm9', 9: '9',
  maj11: 'maj11', min11: 'm11', 11: '11', maj13: 'maj13', 13: '13',
  '7s9': '7#9', '7b9': '7b9', '9s5': 'aug9', '9b5': '9b5', '7s5': 'aug7', '7b5': '7b5',
};

export const CHORD_TYPES = CHORD_TEMPLATES.filter(({ id }) => TYPE_KEYS[id]).map(({ id, label }) => ({
  id,
  label,
  key: TYPE_KEYS[id],
  symbol: ({ maj: '', minMaj7: 'mMaj7', augMaj7: 'maj7#5', m7b5: 'm7b5', '7s9': '7#9', '7b9': '7b9', '7b5': '7b5', '9b5': '9b5' })[id] ?? templateSymbol(id),
}));

const TYPES = new Map(CHORD_TYPES.map((type) => [type.id, type]));
const ALIASES = new Map(CHORD_TYPES.flatMap((type) => (
  [type.key, type.symbol, templateSymbol(type.id)].map((alias) => [alias.toLowerCase(), type.id])
)));
ALIASES.set('min', 'min');
ALIASES.set('min7', 'min7');
ALIASES.set('ø7', 'm7b5');
ALIASES.set('ø', 'm7b5');

export function formatNote(text) {
  return text.replaceAll('#', '♯').replaceAll('b', '♭');
}

export function parseChordQuery(text) {
  const clean = text.normalize('NFKC').replaceAll('♯', '#').replaceAll('♭', 'b').replaceAll('−', '-').replace(/\s+/g, '');
  const root = /^([A-G])([#b]?)(.*)$/i.exec(clean);
  if (!root) return null;
  const split = /\/([A-G])([#b]?)$/i.exec(root[3]);
  const suffix = split ? root[3].slice(0, split.index) : root[3];
  const uppercaseAliases = { M: 'maj', M7: 'maj7', M9: 'maj9', M11: 'maj11', M13: 'maj13' };
  const type = uppercaseAliases[suffix] ?? ALIASES.get(suffix.toLowerCase());
  if (!TYPES.has(type)) return null;
  const note = (letter, accidental) => letter.toUpperCase() + accidental.toLowerCase();
  return { root: note(root[1], root[2]), type, bass: split ? note(split[1], split[2]) : '' };
}

export function chordSymbol({ root, type, bass }) {
  return `${root}${TYPES.get(type).symbol}${bass ? `/${bass}` : ''}`;
}

function playablePosition(position, namesByPitch, bassPitch) {
  const { frets, fingers, baseFret, barres } = position;
  if (frets.length !== 6 || fingers.length !== 6 || !Number.isInteger(baseFret) || baseFret < 1) return null;
  if (frets.some((fret) => !Number.isInteger(fret) || fret < -1)) return null;
  const strings = frets.map((relative, index) => {
    const fret = relative > 0 ? baseFret + relative - 1 : relative;
    const midi = fret < 0 ? null : OPEN_MIDI[index] + fret;
    const name = midi === null ? '' : namesByPitch.get(midi % 12) ?? '';
    return { number: 6 - index, relative, fret, midi, name, finger: fingers[index] };
  });
  const played = strings.filter(({ midi }) => midi !== null);
  if (!played.length || played.some(({ name }) => !name)) return null;
  const lowest = played.reduce((first, current) => current.midi < first.midi ? current : first);
  if (bassPitch !== null && lowest.midi % 12 !== bassPitch) return null;
  return { strings, lowest, baseFret, barres, positions: strings.map(({ fret }) => fret < 0 ? '×' : String(fret)).join('–') };
}

export function lookupChord(database, query) {
  const { root, type, bass } = query;
  const info = TYPES.get(type);
  const chord = buildChord(root, type);
  const rootKey = DATA_KEYS[parseNote(root).pitchClass];
  const bassPitch = bass ? parseNote(bass).pitchClass : null;
  const namesByPitch = new Map(chord.tones.map(({ pitchClass, name }) => [pitchClass, name]));
  if (bass) namesByPitch.set(bassPitch, bass);
  const entries = (database.chords[rootKey] ?? []).filter(({ suffix }) => {
    if (suffix === info.key) return true;
    if (!bass || !suffix.includes('/')) return false;
    return ALIASES.get(suffix.split('/')[0].toLowerCase()) === type;
  });
  const found = new Map();
  for (const position of entries.flatMap((entry) => entry.positions)) {
    const voicing = playablePosition(position, namesByPitch, bassPitch);
    if (voicing && !found.has(voicing.positions)) found.set(voicing.positions, voicing);
  }
  const positions = [...found.values()].sort((left, right) => left.baseFret - right.baseFret);
  const tones = chord.tones.map(({ name }) => formatNote(name));
  return { symbol: formatNote(chordSymbol(query)), typeLabel: info.label, tones, positions };
}

export function concertFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
