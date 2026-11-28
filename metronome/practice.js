export const BPM_MIN = 20;
export const BPM_MAX = 300;

// In 6/8 each click is an eighth note, grouped 3 + 3.
export const METERS = {
  '2/4': { beats: 2, groups: [0] },
  '3/4': { beats: 3, groups: [0] },
  '4/4': { beats: 4, groups: [0] },
  '6/8': { beats: 6, groups: [0, 3], compound: true },
};

export const SUBDIVISIONS = { 1: '不細分', 2: '八分音符', 3: '三連音', 4: '十六分音符' };

export function clampBpm(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
}

// Every click in one bar, in order. level: accent (bar start), group (6/8 second group), beat, sub.
export function barPattern(meterId, subdivision = 1, accentFirst = true) {
  const meter = METERS[meterId] ?? METERS['4/4'];
  const parts = meter.compound ? 1 : subdivision;
  const clicks = [];
  for (let beat = 0; beat < meter.beats; beat++) {
    for (let part = 0; part < parts; part++) {
      let level = 'sub';
      if (part === 0) {
        if (beat === 0 && accentFirst) level = 'accent';
        else if (beat !== 0 && meter.groups.includes(beat) && accentFirst) level = 'group';
        else level = 'beat';
      }
      clicks.push({ beat, part, level });
    }
  }
  return clicks;
}

export function clickSeconds(bpm, meterId, subdivision = 1) {
  const parts = METERS[meterId]?.compound ? 1 : subdivision;
  return 60 / bpm / parts;
}

// Tempo for the bar after `bars` completed bars: +step every `every` bars, never past the ceiling.
export function rampTempo({ start, step, every, ceiling }, bars) {
  if (!every || !step || ceiling <= start) return start;
  return Math.min(ceiling, start + Math.floor(bars / every) * step);
}

// BPM from tap times in milliseconds; a pause longer than `reset` starts a new count.
export function tapTempo(taps, now, reset = 2000) {
  const recent = taps.at(-1) !== undefined && now - taps.at(-1) <= reset ? [...taps, now] : [now];
  const kept = recent.slice(-6);
  if (kept.length < 2) return { taps: kept, bpm: null };
  const average = (kept.at(-1) - kept[0]) / (kept.length - 1);
  return { taps: kept, bpm: clampBpm(60_000 / average) };
}
