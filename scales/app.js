import { concertFrequency, formatNote } from '../voicings/catalog.js';
import { playNotes } from '../voicings/audio.js';
import { playClick } from '../metronome/sound.js';
import { buildScale, formatDegree, MAX_FRET, ROOT_CHOICES, rootPosition, scaleNotes, scalePositions, SCALES, walkSequence } from './practice.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
const FRET_MARKERS = new Set([3, 5, 7, 9, 12]);
const BPM_MIN = 30;
const BPM_MAX = 200;

let current;
let positions = [];
let cells = new Map();
let bpm = 60;
let context;
let master;
let timer;
let running = false;
let wakeLock;
let sequence = [];
let step = 0;
let countIn = 0;
let nextTime = 0;
let queue = [];
let shown;
let lit = [];

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

const noteName = (tone) => formatNote(tone.name);
const where = ({ string, fret }) => `${string} 弦${fret ? `第 ${fret} 格` : '空弦'}`;
const position = () => positions[Number(ui.position.value)] ?? null;
const range = () => position() ?? { from: 0, to: MAX_FRET };

function label(tone) {
  if (ui.labels.value === 'degrees') return formatDegree(tone.degree);
  if (ui.labels.value === 'roots') return tone.degree === '1' ? noteName(tone) : '';
  return noteName(tone);
}

function renderSummary() {
  const { tones, scale } = current;
  ui['scale-summary'].replaceChildren(
    element('strong', `${noteName(tones[0])} ${scale.label}`),
    element('span', tones.map(noteName).join(' · '), 'summary-notes'),
    element('span', tones.map(({ degree }) => formatDegree(degree)).join(' · '), 'summary-degrees'),
  );
}

function renderNeck() {
  const { from, to } = range();
  const frets = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  ui.neck.style.setProperty('--frets', frets.length);
  ui.neck.classList.toggle('whole', !position());
  const grid = [element('span', '弦', 'neck-label neck-corner')];
  for (const fret of frets) grid.push(element('span', String(fret), FRET_MARKERS.has(fret) ? 'fret-number fret-marker' : 'fret-number'));
  const notes = new Map(scaleNotes(current.tones, from, to).map((note) => [`${note.string}:${note.fret}`, note]));
  cells = new Map();
  for (const string of [1, 2, 3, 4, 5, 6]) {
    grid.push(element('span', String(string), 'neck-label'));
    for (const fret of frets) {
      const cell = element('span', '', 'neck-cell');
      if (!fret) cell.classList.add('open-string');
      if (FRET_MARKERS.has(fret)) cell.classList.add('marked-fret');
      const note = notes.get(`${string}:${fret}`);
      if (note) {
        const button = element('button', label(note.tone), note.tone.degree === '1' ? 'note root' : 'note');
        button.type = 'button';
        button.setAttribute('aria-label', `${where(note)} ${noteName(note.tone)}（${formatDegree(note.tone.degree)}）`);
        button.addEventListener('click', () => playNotes([note.midi], 0).catch(() => {}));
        cell.append(button);
        cells.set(`${string}:${fret}`, button);
      }
      grid.push(cell);
    }
  }
  ui.neck.replaceChildren(...grid);
  lit = [];
}

function fillPositions() {
  const whole = ui.position.value === 'all';
  positions = scalePositions(current);
  const options = [new Option(`整個指板（0–${MAX_FRET} 格）`, 'all')];
  positions.forEach(({ from, to, tone }, index) => {
    const name = tone.degree === '1' ? '根音' : formatDegree(tone.degree);
    options.push(new Option(`第 ${from}–${to} 格 · 6 弦 ${noteName(tone)}（${name}）`, String(index)));
  });
  ui.position.replaceChildren(...options);
  // Keep the whole neck if it was shown; otherwise start at the root position.
  const start = rootPosition(positions, current.tones);
  ui.position.value = whole || start < 0 ? 'all' : String(start);
}

function showWalkReady() {
  const chosen = position();
  ui.toggle.disabled = !chosen;
  ui['walk-status'].textContent = chosen
    ? `第 ${chosen.from}–${chosen.to} 格，共 ${walkSequence(scaleNotes(current.tones, chosen.from, chosen.to)).length} 個音一輪。`
    : '先在上方「範圍」選一個把位，才能跟拍走音。';
}

function update({ keepPosition = false } = {}) {
  if (running) stop();
  current = buildScale(Number(ui.root.value), ui.scale.value);
  if (!keepPosition) fillPositions();
  renderSummary();
  renderNeck();
  showWalkReady();
}

function highlight(now, next) {
  for (const button of lit) button.classList.remove('now', 'next');
  lit = [];
  for (const [note, className] of [[next, 'next'], [now, 'now']]) {
    const button = note && cells.get(`${note.string}:${note.fret}`);
    if (button) {
      button.classList.add(className);
      lit.push(button);
    }
  }
}

function playPitch(midi, time) {
  const tone = context.createOscillator();
  const envelope = context.createGain();
  tone.type = 'triangle';
  tone.frequency.value = concertFrequency(midi);
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(0.32, time + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.9, 60 / bpm / Number(ui['per-beat'].value)));
  tone.connect(envelope).connect(master);
  tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
  tone.start(time);
  tone.stop(time + 1);
}

function schedule() {
  // Hidden pages run timers about once a second, so look further ahead there.
  const ahead = document.hidden ? 1.5 : 0.12;
  const perBeat = Number(ui['per-beat'].value);
  while (nextTime < context.currentTime + ahead) {
    if (countIn > 0) {
      if (ui.click.checked) playClick(context, master, 'beat', nextTime);
      queue.push({ countIn: 5 - countIn, time: nextTime });
      countIn--;
      nextTime += 60 / bpm;
      continue;
    }
    const index = step % sequence.length;
    const onBeat = step % perBeat === 0;
    if (ui.click.checked && onBeat) playClick(context, master, index === 0 ? 'accent' : 'beat', nextTime);
    if (ui.pitch.checked) playPitch(sequence[index].midi, nextTime);
    queue.push({ index, round: Math.floor(step / sequence.length) + 1, time: nextTime });
    step++;
    nextTime += 60 / bpm / perBeat;
  }
  if (queue.length > 200) queue.splice(0, queue.length - 200);
}

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);
  let event;
  while (queue.length && queue[0].time <= context.currentTime) event = queue.shift();
  if (!event || event === shown) return;
  shown = event;
  if (event.countIn) {
    highlight(null, sequence[0]);
    ui['walk-status'].textContent = `預備拍 ${event.countIn}／4，先找好第一個音：${where(sequence[0])}`;
    return;
  }
  const note = sequence[event.index];
  const half = Math.ceil(sequence.length / 2);
  const direction = event.index === 0 ? '最低音' : event.index === half - 1 ? '最高音' : event.index < half ? '上行' : '下行';
  highlight(note, sequence[(event.index + 1) % sequence.length]);
  ui['walk-status'].textContent = `第 ${event.round} 輪 · ${direction} · ${noteName(note.tone)}（${formatDegree(note.tone.degree)}）· ${where(note)}`;
}

async function keepScreenOn() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    // Practice continues; the screen may simply turn off on its own schedule.
  }
}

async function start() {
  const chosen = position();
  if (!chosen) return;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) {
    ui['walk-status'].textContent = '這個瀏覽器無法播放節拍聲。';
    return;
  }
  context ??= new AudioContext();
  if (!master) {
    master = context.createGain();
    master.connect(context.destination);
  }
  master.gain.value = ui.volume.valueAsNumber;
  await context.resume();
  sequence = walkSequence(scaleNotes(current.tones, chosen.from, chosen.to));
  running = true;
  step = 0;
  countIn = ui['count-in'].checked ? 4 : 0;
  queue = [];
  shown = undefined;
  nextTime = context.currentTime + 0.06;
  schedule();
  timer = setInterval(schedule, 25);
  ui.toggle.textContent = '停止';
  ui.toggle.setAttribute('aria-pressed', 'true');
  requestAnimationFrame(draw);
  keepScreenOn();
}

function stop() {
  const rounds = shown && !shown.countIn ? shown.round : 0;
  running = false;
  clearInterval(timer);
  queue = [];
  shown = undefined;
  wakeLock?.release().catch(() => {});
  wakeLock = undefined;
  highlight(null, null);
  ui.toggle.textContent = '開始';
  ui.toggle.setAttribute('aria-pressed', 'false');
  showWalkReady();
  if (rounds) ui['walk-status'].textContent = `已停止，走到第 ${rounds} 輪。`;
}

function toggle() {
  if (running) stop();
  else if (position()) start().catch(() => { ui['walk-status'].textContent = '無法開始播放，請再按一次「開始」。'; });
}

function setBpm(value) {
  if (!Number.isFinite(value)) return;
  bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
  if (document.activeElement !== ui.bpm) ui.bpm.value = bpm;
}

ui.root.replaceChildren(...ROOT_CHOICES.map((names, pitchClass) => new Option(names.map(formatNote).join('／'), pitchClass)));
ui.root.value = '9';
ui.scale.replaceChildren(...SCALES.map(({ id, label: text }) => new Option(text, id)));
ui.scale.value = 'minorPentatonic';

ui.root.addEventListener('change', () => update());
ui.scale.addEventListener('change', () => update());
ui.position.addEventListener('change', () => update({ keepPosition: true }));
ui.labels.addEventListener('change', () => {
  for (const [key, button] of cells) {
    const [string, fret] = key.split(':').map(Number);
    const note = scaleNotes(current.tones, fret, fret).find((item) => item.string === string);
    button.textContent = label(note.tone);
  }
});
ui.toggle.addEventListener('click', toggle);
ui.slower.addEventListener('click', () => setBpm(bpm - 1));
ui.faster.addEventListener('click', () => setBpm(bpm + 1));
ui.bpm.addEventListener('change', () => {
  setBpm(ui.bpm.valueAsNumber);
  ui.bpm.value = bpm;
});
ui.volume.addEventListener('input', () => {
  if (master) master.gain.setTargetAtTime(ui.volume.valueAsNumber, context.currentTime, 0.01);
});
document.addEventListener('visibilitychange', () => {
  // The browser releases the screen lock whenever the page is hidden.
  if (wakeLock?.released) wakeLock = undefined;
  if (running && !document.hidden && !wakeLock) keepScreenOn();
});
document.addEventListener('keydown', (event) => {
  if (event.repeat && event.key === ' ') return;
  if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === ' ' && event.target.closest('button, a')) return;
  if (event.key === ' ') toggle();
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') setBpm(bpm + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 5 : 1));
  else return;
  event.preventDefault();
});

setBpm(bpm);
update();
