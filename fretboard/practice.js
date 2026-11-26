import { guitarPitchAt, PITCH_LABELS } from '../src/music.js';

const SOLFEGE = ['Do', 'Do♯ / Re♭', 'Re', 'Re♯ / Mi♭', 'Mi', 'Fa', 'Fa♯ / Sol♭', 'Sol', 'Sol♯ / La♭', 'La', 'La♯ / Si♭', 'Si'];

export function pitchName(pitchClass, notation = 'letters') {
  if (notation === 'solfege') return SOLFEGE[pitchClass];
  return PITCH_LABELS[pitchClass].replaceAll('#', '♯').replaceAll('b', '♭').replace('/', ' / ');
}

export function answerPitches(naturalOnly) {
  return PITCH_LABELS.flatMap((label, pitchClass) => !naturalOnly || !label.includes('/') ? [pitchClass] : []);
}

export function fretboardPositions({ strings, from, to, naturalOnly }) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 24 || from > to) return [];
  const allowedPitches = new Set(answerPitches(naturalOnly));
  return strings.flatMap((stringNumber) => Array.from({ length: to - from + 1 }, (_, offset) => {
    const fret = from + offset;
    return { stringNumber, fret, pitch: guitarPitchAt(stringNumber, fret) };
  })).filter(({ pitch }) => allowedPitches.has(pitch));
}

export function shufflePositions(positions, previous, random = Math.random) {
  const deck = [...positions];
  for (let right = deck.length - 1; right > 0; right--) {
    const left = Math.floor(random() * (right + 1));
    [deck[left], deck[right]] = [deck[right], deck[left]];
  }
  const last = deck.length - 1;
  if (last > 0 && deck[last] === previous) [deck[0], deck[last]] = [deck[last], deck[0]];
  return deck;
}
