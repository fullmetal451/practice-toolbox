const AUDIO_SPEED_MIN = 0.25;
const AUDIO_SPEED_MAX = 2;
export const AUDIO_SPEED_STEP = 0.05;
export const AUDIO_SPEEDS = Array.from(
  { length: Math.round((AUDIO_SPEED_MAX - AUDIO_SPEED_MIN) / AUDIO_SPEED_STEP) + 1 },
  (_, index) => Number((AUDIO_SPEED_MIN + index * AUDIO_SPEED_STEP).toFixed(2)),
);

export function youtubeId(input) {
  const value = input.trim();
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let id;
  if (host === 'youtu.be') id = parts[0];
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    if (['shorts', 'live', 'embed'].includes(parts[0])) id = parts[1];
  }
  return /^[\w-]{11}$/.test(id ?? '') ? id : null;
}

export function newClip(duration) {
  return { a: 0, b: duration, speed: 1, bpm: null, countIn: 'off', loop: true, gap: 0, ramp: 0, ceiling: 1 };
}

export function validRange({ a, b }, duration) {
  return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b > a && b <= duration;
}

export function trackEnd(b, previousDuration, duration) {
  if (b === previousDuration || (b > duration && b <= previousDuration)) return duration;
  return b;
}

export function nextSpeed(clip, rate, rounds, speeds) {
  if (!clip.ramp || rounds % clip.ramp !== 0) return rate;
  return speeds.find((speed) => speed > rate && speed <= clip.ceiling) ?? rate;
}

export function practiceBpm(bpm, speed) {
  return Number.isFinite(bpm) && bpm >= 20 && bpm <= 400 ? Number((bpm * speed).toFixed(1)) : null;
}
