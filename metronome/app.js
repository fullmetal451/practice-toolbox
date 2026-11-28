import { barPattern, clampBpm, clickSeconds, METERS, rampTempo, tapTempo } from './practice.js';
import { playClick } from './sound.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));

let bpm = 80;
let context;
let master;
let timer;
let running = false;
let pattern = [];
let clickIndex = 0;
let bars = 0;
let nextTime = 0;
let queue = [];
let shown;
let taps = [];
let wakeLock;
// Automatic speed-up counts bars from the last manual tempo change.
let rampBase = bpm;
let rampFrom = 0;

const settings = () => ({ meter: ui.meter.value, subdivision: Number(ui.subdivision.value), accent: ui.accent.checked });

function readInteger(input, min, max) {
  const value = input.valueAsNumber;
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : null;
}

function ramp() {
  const every = readInteger(ui['ramp-every'], 0, 64) ?? 0;
  const step = readInteger(ui['ramp-step'], 1, 50) ?? 0;
  const ceiling = clampBpm(ui['ramp-ceiling'].valueAsNumber) ?? rampBase;
  return { start: rampBase, step, every, ceiling };
}

function showRamp() {
  const { every, step, ceiling } = ramp();
  let text = '每幾小節設為 0，即關閉自動加速。停止後回到起始速度。';
  if (every && ceiling <= rampBase) text = `上限要高於起始速度 ${rampBase} BPM 才會加速。`;
  else if (every) text = `每 ${every} 小節加 ${step} BPM，到 ${ceiling} BPM 為止。停止後回到 ${rampBase} BPM。`;
  ui['ramp-status'].textContent = text;
}

function setBpm(value, { manual = true } = {}) {
  const next = clampBpm(value);
  if (next === null) return;
  bpm = next;
  if (document.activeElement !== ui.bpm) ui.bpm.value = bpm;
  ui['bpm-slider'].value = bpm;
  ui['bpm-slider'].setAttribute('aria-valuetext', `${bpm} BPM`);
  if (manual) {
    rampBase = bpm;
    rampFrom = bars;
    showRamp();
  }
}

function drawBeats(active) {
  const { meter } = settings();
  const { beats } = METERS[meter];
  if (ui.beats.childElementCount !== beats) {
    ui.beats.replaceChildren(...Array.from({ length: beats }, () => document.createElement('span')));
  }
  [...ui.beats.children].forEach((dot, index) => {
    const click = pattern.find((item) => item.beat === index && item.part === 0) ?? barPattern(meter, 1, ui.accent.checked)[index];
    dot.dataset.level = click.level;
    dot.classList.toggle('on', active?.beat === index);
    dot.classList.toggle('sub', active?.beat === index && active.part > 0);
  });
}

function showMeterHelp() {
  const compound = METERS[ui.meter.value].compound;
  ui.subdivision.disabled = compound;
  ui['meter-help'].textContent = compound ? '6/8 每一聲是八分音符，BPM 以八分音符計算，第 1、4 拍較重。' : '';
}

function schedule() {
  // Hidden pages run timers about once a second, so look further ahead there.
  const ahead = document.hidden ? 1.5 : 0.12;
  while (nextTime < context.currentTime + ahead) {
    if (clickIndex === 0) {
      const tempo = rampTempo(ramp(), bars - rampFrom);
      if (tempo !== bpm) setBpm(tempo, { manual: false });
    }
    const click = pattern[clickIndex];
    playClick(context, master, click.level, nextTime);
    queue.push({ ...click, time: nextTime, bar: bars + 1 });
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    nextTime += clickSeconds(bpm, ui.meter.value, Number(ui.subdivision.value));
    clickIndex++;
    if (clickIndex >= pattern.length) {
      clickIndex = 0;
      bars++;
    }
  }
}

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);
  let current;
  while (queue.length && queue[0].time <= context.currentTime) current = queue.shift();
  if (!current || current === shown) return;
  shown = current;
  drawBeats(current);
  const status = `第 ${current.bar} 小節 · ${bpm} BPM`;
  if (ui['bar-status'].textContent !== status) ui['bar-status'].textContent = status;
}

function rebuildPattern({ restartBar }) {
  const { meter, subdivision, accent } = settings();
  pattern = barPattern(meter, subdivision, accent);
  if (restartBar) clickIndex = 0;
  else clickIndex %= pattern.length;
  drawBeats(null);
}

async function keepScreenOn() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    // Playback continues; the screen may simply turn off on its own schedule.
  }
}

async function start() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) {
    ui['bar-status'].textContent = '這個瀏覽器無法播放節拍聲。';
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
  bars = 0;
  rampBase = bpm;
  rampFrom = 0;
  queue = [];
  shown = undefined;
  rebuildPattern({ restartBar: true });
  nextTime = context.currentTime + 0.06;
  schedule();
  timer = setInterval(schedule, 25);
  ui.toggle.textContent = '停止';
  ui.toggle.setAttribute('aria-pressed', 'true');
  requestAnimationFrame(draw);
  keepScreenOn();
}

function stop() {
  const reached = shown?.bar;
  running = false;
  clearInterval(timer);
  queue = [];
  wakeLock?.release().catch(() => {});
  wakeLock = undefined;
  if (bpm !== rampBase) setBpm(rampBase);
  drawBeats(null);
  ui.toggle.textContent = '開始';
  ui.toggle.setAttribute('aria-pressed', 'false');
  ui['bar-status'].textContent = reached ? `已停止，播到第 ${reached} 小節。` : '已停止。';
}

function toggle() {
  if (running) stop();
  else start().catch(() => { ui['bar-status'].textContent = '無法開始播放，請再按一次「開始」。'; });
}

function tap() {
  const result = tapTempo(taps, performance.now());
  taps = result.taps;
  if (result.bpm === null) {
    ui['tap-status'].textContent = '照想要的速度繼續點按。';
    return;
  }
  setBpm(result.bpm);
  ui['tap-status'].textContent = `點按 ${taps.length} 下，約 ${result.bpm} BPM。`;
}

ui.toggle.addEventListener('click', toggle);
ui.tap.addEventListener('click', tap);
ui.slower.addEventListener('click', () => setBpm(bpm - 1));
ui.faster.addEventListener('click', () => setBpm(bpm + 1));
ui['bpm-slider'].addEventListener('input', () => setBpm(ui['bpm-slider'].valueAsNumber));
ui.bpm.addEventListener('change', () => {
  setBpm(ui.bpm.valueAsNumber);
  ui.bpm.value = bpm;
});
ui.meter.addEventListener('change', () => {
  showMeterHelp();
  rebuildPattern({ restartBar: true });
});
ui.subdivision.addEventListener('change', () => rebuildPattern({ restartBar: true }));
ui.accent.addEventListener('change', () => rebuildPattern({ restartBar: false }));
ui.volume.addEventListener('input', () => {
  if (master) master.gain.setTargetAtTime(ui.volume.valueAsNumber, context.currentTime, 0.01);
});
for (const id of ['ramp-every', 'ramp-step', 'ramp-ceiling']) {
  ui[id].addEventListener('change', () => {
    rampBase = bpm;
    rampFrom = bars;
    showRamp();
  });
}
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
  else if (event.key.toLowerCase() === 't' && !event.repeat) tap();
  else return;
  event.preventDefault();
});

showMeterHelp();
rebuildPattern({ restartBar: true });
setBpm(bpm);
