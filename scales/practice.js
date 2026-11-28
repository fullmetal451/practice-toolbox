// spellTone was exported from music.js on 2026-11-28. The query gives it a new URL so a browser holding the older,
// cached music.js (without that export) still loads this page. music.js is pure, so a second copy is harmless.
import { spellTone } from '../src/music.js?v=2026-11-28';

export const SCALES = [
  { id: 'major', label: '大調音階', degrees: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'minor', label: '自然小調音階', degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'majorPentatonic', label: '大調五聲音階', degrees: ['1', '2', '3', '5', '6'] },
  { id: 'minorPentatonic', label: '小調五聲音階', degrees: ['1', 'b3', '4', '5', 'b7'] },
  { id: 'blues', label: '藍調音階', degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
];

// Both spellings of each black key; the first wins when they need the same number of accidentals.
export const ROOT_CHOICES = [['C'], ['Db', 'C#'], ['D'], ['Eb', 'D#'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['Ab', 'G#'], ['A'], ['Bb', 'A#'], ['B']];
export const MAX_FRET = 12;
// MIDI numbers of the open strings, string 1 (high E) to string 6 (low E).
const OPEN_MIDI = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

const SCALE_BY_ID = new Map(SCALES.map((scale) => [scale.id, scale]));

export function buildScale(pitchClass, scaleId) {
  const scale = SCALE_BY_ID.get(scaleId);
  const score = (tones) => tones.reduce((sum, { accidental }) => sum + Math.abs(accidental) + (Math.abs(accidental) > 1 ? 10 : 0), 0);
  const [best] = ROOT_CHOICES[pitchClass]
    .map((root) => ({ root, tones: scale.degrees.map((degree) => spellTone(root, degree)) }))
    .sort((left, right) => score(left.tones) - score(right.tones));
  return { ...best, scale };
}

// Every scale note between two frets, string 1 first.
export function scaleNotes(tones, from = 0, to = MAX_FRET) {
  const byPitch = new Map(tones.map((tone) => [tone.pitchClass, tone]));
  return [1, 2, 3, 4, 5, 6].flatMap((string) => Array.from({ length: to - from + 1 }, (_, offset) => {
    const fret = from + offset;
    const midi = OPEN_MIDI[string] + fret;
    const tone = byPitch.get(midi % 12);
    return tone ? [{ string, fret, midi, tone }] : [];
  }).flat());
}

// A position starts at a scale note on string 6: 4 frets for scales up to 6 notes, 5 frets (one stretch) for 7-note scales.
// Only positions that end by MAX_FRET are listed.
export function scalePositions({ tones, scale }) {
  const width = scale.degrees.length > 6 ? 5 : 4;
  return scaleNotes(tones, 0, MAX_FRET).filter(({ string }) => string === 6)
    .map(({ fret, tone }) => ({ from: fret, to: fret + width - 1, tone }))
    .filter(({ to }) => to <= MAX_FRET);
}

// The position starting on the root on string 6; when that runs past MAX_FRET, the one starting where string 5 plays the root.
export function rootPosition(positions, tones) {
  const onString6 = positions.findIndex(({ tone }) => tone.degree === '1');
  if (onString6 >= 0) return onString6;
  const fret = scaleNotes(tones, 0, MAX_FRET).find(({ string, tone }) => string === 5 && tone.degree === '1')?.fret;
  return positions.findIndex(({ from }) => from === fret);
}

// Low to high, string 6 to string 1; a pitch already reached on a lower string is skipped.
export function ascending(notes) {
  const ordered = [...notes].sort((left, right) => right.string - left.string || left.fret - right.fret);
  const result = [];
  for (const note of ordered) if (!result.length || note.midi > result.at(-1).midi) result.push(note);
  return result;
}

// Up and back down, without repeating the top and bottom notes when it loops.
export function walkSequence(notes) {
  const up = ascending(notes);
  return up.length < 3 ? up : [...up, ...up.slice(1, -1).reverse()];
}

export function formatDegree(degree) {
  return degree.replaceAll('b', '♭').replaceAll('#', '♯');
}
