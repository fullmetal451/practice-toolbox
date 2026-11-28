import { formatNote, lookupChord } from '../voicings/catalog.js';
import { diagram, positionLabel } from '../voicings/diagram.js';
import { playClick } from '../metronome/sound.js';
import { BEAT_CHOICES, clampBpm, countInBeats, MAX_CHORDS, nextChordIndex, parseChordList, PRESETS } from './practice.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));

let database;
let chords = [];
let bpm = 60;
let context;
let master;
let timer;
let running = false;
let wakeLock;
// Scheduler position: the chord being scheduled, the one after it, and the beat inside it.
let chordIndex = 0;
let upcoming = 1;
let beat = 0;
let countIn = 0;
let countTotal = 0;
let changes = 0;
let round = 1;
let nextTime = 0;
let queue = [];
let shown;
let drawnPair = '';

const beatsPerChord = () => Number(ui['beats-per-chord'].value);
const shuffle = () => ui.order.value === 'shuffle';
const names = () => chords.map(({ name }) => name);

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function voicing(chord) {
  return chord.positions[chord.voicing];
}

function showChord(prefix, chord, withNotes) {
  ui[`${prefix}-name`].textContent = formatNote(chord.name);
  const current = voicing(chord);
  ui[`${prefix}-position`].textContent = positionLabel(current);
  ui[`${prefix}-diagram`].replaceChildren(diagram(current, withNotes ? {} : { noteLabel: null }));
}

function showPair(now, next, force = false) {
  const key = `${now}:${chords[now].voicing}/${next}:${chords[next].voicing}`;
  if (!force && key === drawnPair) return;
  drawnPair = key;
  showChord('now', chords[now], true);
  showChord('next', chords[next], false);
}

function drawBeats(total, active, isCountIn = false) {
  if (ui.beats.childElementCount !== total) {
    ui.beats.replaceChildren(...Array.from({ length: total }, () => document.createElement('span')));
  }
  [...ui.beats.children].forEach((dot, index) => {
    dot.classList.toggle('first', index === 0 && !isCountIn);
    dot.classList.toggle('count', isCountIn);
    dot.classList.toggle('on', index === active);
  });
}

function showIdle() {
  if (chords.length < 2) return;
  ui['now-label'].textContent = '第一個和弦';
  ui['next-box'].classList.remove('soon');
  // Pick the second chord now, so a shuffled practice starts with the pair shown here.
  upcoming = nextChordIndex(0, names(), shuffle());
  showPair(0, upcoming, true);
  drawBeats(beatsPerChord(), -1);
}

function renderCards() {
  ui['chord-cards'].replaceChildren(...chords.map((chord, index) => {
    const card = element('article', '', 'chord-card');
    const heading = element('div', '', 'card-heading');
    heading.append(element('h3', formatNote(chord.name)), element('span', `${chord.voicing + 1}／${chord.positions.length}`, 'hint'));
    const controls = element('div', '', 'card-controls');
    for (const [label, step] of [['‹', -1], ['›', 1]]) {
      const button = element('button', label);
      button.type = 'button';
      button.disabled = chord.positions.length < 2;
      button.setAttribute('aria-label', `${formatNote(chord.name)} ${step < 0 ? '上' : '下'}一個指法`);
      button.addEventListener('click', () => {
        chord.voicing = (chord.voicing + step + chord.positions.length) % chord.positions.length;
        renderCards();
        ui['chord-cards'].children[index].querySelector(`button:nth-child(${step < 0 ? 1 : 2})`).focus();
        if (running && shown) showPair(shown.chord, shown.next);
        else if (!running) showPair(0, upcoming);
      });
      controls.append(button);
    }
    card.append(heading, element('p', positionLabel(voicing(chord)), 'hint'), diagram(voicing(chord), { noteLabel: null }), controls);
    return card;
  }));
}

function applySet() {
  const { chords: parsed, invalid } = parseChordList(ui['chord-list'].value);
  const missing = parsed.filter((chord) => !lookupChord(database, chord).positions.length).map(({ name }) => formatNote(name));
  let problem = '';
  if (invalid.length) problem = `無法辨識：${invalid.join('、')}。`;
  else if (missing.length) problem = `資料庫沒有這些和弦的指法：${missing.join('、')}。`;
  else if (parsed.length < 2) problem = '至少要 2 個和弦才能練換和弦。';
  else if (parsed.length > MAX_CHORDS) problem = `最多 ${MAX_CHORDS} 個和弦。`;
  if (problem) {
    ui['set-status'].textContent = `${problem}和弦組沒有變更。`;
    return false;
  }
  if (running) stop();
  // Keep a chosen voicing when the same chord appears again in the new set.
  const kept = new Map(chords.map((chord) => [chord.name, chord.voicing]));
  chords = parsed.map((chord) => {
    const { positions } = lookupChord(database, chord);
    return { ...chord, positions, voicing: Math.min(kept.get(chord.name) ?? 0, positions.length - 1) };
  });
  ui['chord-list'].value = chords.map(({ name }) => name).join(' ');
  ui.preset.value = PRESETS.includes(ui['chord-list'].value) ? ui['chord-list'].value : '';
  ui['set-status'].textContent = `${chords.length} 個和弦。按 ‹ › 換成其他指法。`;
  renderCards();
  showIdle();
  ui.toggle.disabled = false;
  ui.status.textContent = '按「開始」練習。';
  return true;
}

function setBpm(value) {
  const next = clampBpm(value);
  if (next === null) return;
  bpm = next;
  if (document.activeElement !== ui.bpm) ui.bpm.value = bpm;
}

function schedule() {
  // Hidden pages run timers about once a second, so look further ahead there.
  const ahead = document.hidden ? 1.5 : 0.12;
  while (nextTime < context.currentTime + ahead) {
    let event;
    if (countIn > 0) {
      event = { countIn: true, beat: countTotal - countIn, chord: chordIndex, next: upcoming };
      countIn--;
    } else {
      if (beat >= beatsPerChord()) {
        // The beat count can drop mid-chord when the setting changes; move on at once.
        chordIndex = upcoming;
        upcoming = nextChordIndex(chordIndex, names(), shuffle());
        beat = 0;
        changes++;
        if (chordIndex === 0 && !shuffle()) round++;
      }
      event = { beat, chord: chordIndex, next: upcoming, changes, round };
      beat++;
    }
    if (ui.click.checked) playClick(context, master, !event.countIn && event.beat === 0 ? 'accent' : 'beat', nextTime);
    queue.push({ ...event, time: nextTime });
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    nextTime += 60 / bpm;
  }
}

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);
  let current;
  while (queue.length && queue[0].time <= context.currentTime) current = queue.shift();
  if (!current || current === shown) return;
  shown = current;
  showPair(current.chord, current.next);
  const total = beatsPerChord();
  if (current.countIn) {
    ui['now-label'].textContent = `預備拍 ${current.beat + 1}／${countTotal}，先按好`;
    drawBeats(countTotal, current.beat, true);
    ui['next-box'].classList.remove('soon');
    return;
  }
  ui['now-label'].textContent = '現在';
  drawBeats(total, current.beat);
  ui['next-box'].classList.toggle('soon', total > 1 && current.beat === total - 1);
  ui.status.textContent = `${shuffle() ? '' : `第 ${current.round} 輪 · `}已換 ${current.changes} 次 · ${bpm} BPM`;
}

async function keepScreenOn() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    // Practice continues; the screen may simply turn off on its own schedule.
  }
}

async function start() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) {
    ui.status.textContent = '這個瀏覽器無法播放節拍聲。';
    return;
  }
  context ??= new AudioContext();
  if (!master) {
    master = context.createGain();
    master.connect(context.destination);
  }
  master.gain.value = ui.volume.valueAsNumber;
  await context.resume();
  running = true;
  chordIndex = 0;
  beat = 0;
  countTotal = ui['count-in'].checked ? countInBeats(beatsPerChord()) : 0;
  countIn = countTotal;
  changes = 0;
  round = 1;
  queue = [];
  shown = undefined;
  nextTime = context.currentTime + 0.06;
  schedule();
  timer = setInterval(schedule, 25);
  ui.toggle.textContent = '停止';
  ui.toggle.setAttribute('aria-pressed', 'true');
  ui.status.textContent = countTotal ? '預備拍，先按好第一個和弦。' : '開始。';
  requestAnimationFrame(draw);
  keepScreenOn();
}

function stop() {
  const reached = shown && !shown.countIn ? shown.changes : null;
  running = false;
  clearInterval(timer);
  queue = [];
  shown = undefined;
  wakeLock?.release().catch(() => {});
  wakeLock = undefined;
  ui.toggle.textContent = '開始';
  ui.toggle.setAttribute('aria-pressed', 'false');
  showIdle();
  ui.status.textContent = reached === null ? '已停止。' : `已停止，這次換了 ${reached} 次。`;
}

function toggle() {
  if (!chords.length) return;
  if (running) stop();
  else start().catch(() => { ui.status.textContent = '無法開始播放，請再按一次「開始」。'; });
}

ui['beats-per-chord'].replaceChildren(...BEAT_CHOICES.map((value) => new Option(`${value} 拍`, value)));
ui['beats-per-chord'].value = '4';
ui.preset.replaceChildren(new Option('自訂', ''), ...PRESETS.map((set) => new Option(set.split(' ').map(formatNote).join(' · '), set)));

ui.toggle.addEventListener('click', toggle);
ui.slower.addEventListener('click', () => setBpm(bpm - 1));
ui.faster.addEventListener('click', () => setBpm(bpm + 1));
ui.bpm.addEventListener('change', () => {
  setBpm(ui.bpm.valueAsNumber);
  ui.bpm.value = bpm;
});
ui['set-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  applySet();
});
ui.preset.addEventListener('change', () => {
  if (!ui.preset.value) return;
  ui['chord-list'].value = ui.preset.value;
  applySet();
});
for (const id of ['beats-per-chord', 'order']) ui[id].addEventListener('change', () => { if (!running) showIdle(); });
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
try {
  const response = await fetch('../voicings/guitar.json');
  if (!response.ok) throw new Error('Chord data failed to load');
  database = await response.json();
  applySet();
} catch {
  ui.status.textContent = '目前無法讀取指法資料，請重新整理這個頁面。';
}
