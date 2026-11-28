import { chordSymbol, parseChordQuery } from '../voicings/catalog.js';

export const BPM_MIN = 30;
export const BPM_MAX = 200;
export const MAX_CHORDS = 12;
export const BEAT_CHOICES = [1, 2, 3, 4, 6, 8];

export const PRESETS = [
  'C G Am F',
  'G C D',
  'Am Dm E',
  'E A D',
  'C Am F G',
  'G Em C D',
  'D A Bm G',
  'Em C G D',
];

// Chord names may be separated by spaces, commas, Chinese commas, bars or arrows.
export function splitChordList(text) {
  return text.normalize('NFKC').split(/[\s,，、|→>]+/).filter(Boolean);
}

export function parseChordList(text) {
  const chords = [];
  const invalid = [];
  for (const token of splitChordList(text)) {
    const query = parseChordQuery(token);
    if (query) chords.push({ ...query, name: chordSymbol(query) });
    else invalid.push(token);
  }
  return { chords, invalid };
}

export function clampBpm(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
}

// In order: the next chord in the list. Shuffled: any chord with a different name, so every change is a real change.
export function nextChordIndex(current, names, shuffle, random = Math.random) {
  if (!shuffle) return (current + 1) % names.length;
  let choices = names.map((_, index) => index).filter((index) => names[index] !== names[current]);
  if (!choices.length) choices = names.map((_, index) => index).filter((index) => index !== current);
  if (!choices.length) return current;
  return choices[Math.floor(random() * choices.length)];
}

// One bar of 4 before the first chord, or 3 when each chord lasts 3 or 6 beats.
export function countInBeats(beatsPerChord) {
  return beatsPerChord % 3 === 0 ? 3 : 4;
}
