import { createAudio, createYouTube, delay, playCountIn, unlockCountInAudio } from './media.js';
import { AUDIO_SPEEDS, AUDIO_SPEED_STEP, newClip, nextSpeed, practiceBpm, trackEnd, validRange, youtubeId } from './practice.js';
import { readLibrary, storedAudio, writeLibrary } from './storage.js';

const elements = [...document.querySelectorAll('[id]')];
const ui = Object.fromEntries(elements.map((element) => [element.id, element]));
const library = readLibrary();
let track;
let file;
let media;
let load;
let loading = false;
let duration = 0;
let clip = newClip(null);
let selected;
let speeds = [];
let sequence;
let practicing = false;
let rounds = 0;
let rate = 1;
let shownRate = 1;
let scrubbing = false;
let retainOperation;
let recentRequest;
// Set once playback is seen before B in the current round, so a stale
// YouTube time reported just after jumping back to A cannot end the round again.
let armed = false;
let savedState;

function say(id, message = '', error = false) {
  if (ui[id].textContent !== message) ui[id].textContent = message;
  ui[id].classList.toggle('error', error);
}

function persist() {
  try {
    writeLibrary(library);
    return true;
  } catch {
    say('storage-status', '瀏覽器無法儲存練習設定。這次仍可使用播放器。', true);
    return false;
  }
}

function timeLabel(time) {
  const hundredths = Math.floor((time || 0) * 100 + 0.0001);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = String(Math.floor(hundredths / 100) % 60).padStart(2, '0');
  return `${minutes}:${seconds}.${String(hundredths % 100).padStart(2, '0')}`;
}

function readNumber(id, min, max, fallback = null, integer = false) {
  const value = ui[id].valueAsNumber;
  if (!Number.isFinite(value)) return fallback;
  const bounded = Math.min(max, Math.max(min, value));
  return integer ? Math.round(bounded) : bounded;
}

function showTempo() {
  const bpm = practiceBpm(ui['original-bpm'].valueAsNumber, shownRate);
  say('tempo-readout', bpm === null ? '目前 － BPM' : `目前 ${bpm} BPM`);
}

function drawRange() {
  const valid = validRange(clip, duration);
  ui.timeline.style.setProperty('--start', valid ? `${100 * clip.a / duration}%` : '0%');
  ui.timeline.style.setProperty('--end', valid ? `${100 * clip.b / duration}%` : '0%');
  say('range-status', valid ? 'A、B 點以秒為單位。' : '請設定 A、B 點。B 必須晚於 A，並在曲子長度內。', !valid && !!duration);
}

function showRateOptions() {
  const youtube = track?.kind === 'youtube';
  ui.speed.min = youtube ? 0 : AUDIO_SPEEDS[0];
  ui.speed.max = youtube ? Math.max(0, speeds.length - 1) : AUDIO_SPEEDS.at(-1);
  ui.speed.step = youtube ? 1 : AUDIO_SPEED_STEP;
  ui.speed.disabled = youtube && speeds.length < 2;
  const ceiling = effectiveSpeed(clip.ceiling);
  const ceilingRates = [...new Set([...speeds, ceiling])].sort((a, b) => a - b);
  ui.ceiling.replaceChildren(...ceilingRates.map((speed) => new Option(`${speed}×`, speed)));
  ui.ceiling.value = ceiling;
  say('speed-help', youtube ? '使用這部 YouTube 影片支援的速度。' : `每格 ${AUDIO_SPEED_STEP} 倍。`);
  showCurrentRate(true);
}

function showCurrentRate(force = false) {
  const current = media && !loading ? media.rate() : effectiveSpeed(clip.speed);
  if (!force && current === shownRate) return;
  shownRate = current;
  if (!ui.speed.matches(':active')) {
    ui.speed.value = track?.kind === 'youtube' ? Math.max(0, speeds.indexOf(current)) : current;
  }
  ui.speed.setAttribute('aria-valuetext', `${current} 倍`);
  say('speed-value', `${current}×`);
  showTempo();
}

function refreshRates() {
  const next = [...new Set(media.rates().filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
  if (!next.length) next.push(1);
  if (next.join() === speeds.join()) return;
  speeds = next;
  showRateOptions();
}

function effectiveSpeed(speed) {
  // Earlier audio clips may have a saved quarter-step setting.
  if (track?.kind === 'audio' && speed >= 0.25 && speed <= 2) return speed;
  return speeds.includes(speed) ? speed : speeds.includes(1) ? 1 : speeds[0] ?? 1;
}

function clipState() {
  return JSON.stringify([clip.a, clip.b, clip.speed, clip.bpm ?? null, clip.countIn, clip.loop, clip.gap, clip.ramp, clip.ceiling, ui['clip-name'].value.trim()]);
}

function markSaved() {
  savedState = selected ? clipState() : undefined;
  ui['clip-dirty'].hidden = true;
}

function unsaved() {
  return !!selected && savedState !== undefined && clipState() !== savedState;
}

function confirmDiscard() {
  return !unsaved() || window.confirm(`「${clip.name}」有尚未儲存的變更，確定要放棄嗎？`);
}

function showClip() {
  ui['mark-a-time'].value = clip.a ?? '';
  ui['mark-b-time'].value = clip.b ?? '';
  ui['original-bpm'].value = clip.bpm ?? track?.bpm ?? '';
  ui['count-in'].value = clip.countIn;
  ui['loop-enabled'].checked = clip.loop;
  ui.gap.value = clip.gap;
  ui.ramp.value = clip.ramp;
  ui['clip-name'].value = clip.name ?? '';
  ui.save.textContent = selected ? '更新片段' : '儲存片段';
  ui['save-new'].hidden = !selected;
  showRateOptions();
  drawRange();
}

function listButton(label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

function renderLists() {
  const clips = track?.clips ?? [];
  const clipRows = clips.map((entry) => {
    const row = document.createElement('li');
    const button = listButton(`${entry.name} · ${entry.speed}×`, () => selectClip(entry));
    button.setAttribute('aria-current', String(entry.id === selected));
    const remove = listButton('刪除', () => {
      if (!window.confirm(`刪除「${entry.name}」？`)) return;
      track.clips = track.clips.filter((item) => item.id !== entry.id);
      if (selected === entry.id) {
        const name = ui['clip-name'].value;
        selected = undefined;
        showClip();
        ui['clip-name'].value = name;
        markSaved();
      }
      const saved = persist();
      renderLists();
      say('clip-status', saved ? '已刪除片段。' : '已在這次工作階段移除。', !saved);
    });
    remove.setAttribute('aria-label', `刪除 ${entry.name}`);
    row.append(button, remove);
    return row;
  });
  ui.clips.replaceChildren(...clipRows);
  ui['clips-empty'].hidden = !!clipRows.length;

  const recents = library.toSorted((a, b) => b.updatedAt - a.updatedAt);
  const recentRows = recents.map((entry) => {
    const row = document.createElement('li');
    const suffix = entry.kind === 'audio' && !entry.retained ? '（需選檔）' : '';
    const button = listButton(entry.title + suffix, () => openRecent(entry));
    button.setAttribute('aria-current', String(entry.id === track?.id));
    row.append(button);
    if (entry.id !== track?.id) {
      const remove = listButton('移除', () => removeRecent(entry));
      remove.setAttribute('aria-label', `從最近練習移除 ${entry.title}`);
      row.append(remove);
    }
    return row;
  });
  ui.recent.replaceChildren(...recentRows);
  ui['recent-empty'].hidden = !!recentRows.length;
}

async function removeRecent(entry) {
  const count = entry.clips?.length ?? 0;
  const extras = [count ? `${count} 個片段` : '', entry.retained ? '保留的音檔' : ''].filter(Boolean).join('和');
  const spacer = /^\d/.test(extras) ? ' ' : '';
  if (!window.confirm(`從最近練習移除「${entry.title}」${extras ? `，連同${spacer}${extras}` : ''}？`)) return;
  if (entry.id === track?.id) return;
  const index = library.indexOf(entry);
  if (index !== -1) library.splice(index, 1);
  const saved = persist();
  renderLists();
  let audioRemoved = true;
  if (entry.retained) {
    try {
      await storedAudio(entry.id, null);
    } catch {
      audioRemoved = false;
    }
  }
  if (!audioRemoved) say('storage-status', '已移除紀錄，但無法刪除保留的音檔。', true);
  else say('storage-status', saved ? `已移除「${entry.title}」。` : '已在這次工作階段移除，瀏覽器無法儲存。', !saved);
}

function stopSequence() {
  sequence?.abort();
  sequence = undefined;
  say('beat');
}

function resetPractice() {
  stopSequence();
  media?.pause();
  practicing = false;
  rounds = 0;
  say('play-state');
}

function editSavedClip({ beats, ...settings }) {
  // Retain the saved count-in mode. The beat count is now always four.
  if (duration && Number.isFinite(settings.b)) settings.b = Math.min(settings.b, duration);
  selected = settings.id;
  clip = { countIn: 'off', ...settings };
}

function selectClip(entry) {
  if (!media || loading || !duration) return;
  if (entry.id !== selected && !confirmDiscard()) return;
  resetPractice();
  editSavedClip(entry);
  media.setRate(effectiveSpeed(clip.speed));
  showClip();
  markSaved();
  renderLists();
  say('clip-status', `已選擇「${clip.name}」。`);
}

function saveClip(copy = false) {
  if (!validRange(clip, duration)) return say('clip-status', '請先修正 A、B 點。', true);
  const name = ui['clip-name'].value.trim();
  if (!name) {
    ui['clip-name'].focus();
    return say('clip-status', '請輸入片段名稱。', true);
  }
  selected = !copy && selected ? selected : crypto.randomUUID();
  clip = { ...clip, name, id: selected };
  const index = track.clips.findIndex(({ id }) => id === selected);
  if (index === -1) track.clips.push(clip);
  else track.clips[index] = clip;
  clip = { ...clip };
  const saved = persist();
  showClip();
  markSaved();
  renderLists();
  say('clip-status', saved ? `已儲存「${name}」。` : '這次工作階段已保留，瀏覽器無法儲存。', !saved);
}

function displayDuration() {
  const length = media.duration();
  if (!Number.isFinite(length) || length <= 0 || length === duration) return;
  const previousDuration = duration;
  duration = length;
  ui.duration.textContent = timeLabel(length);
  ui.timeline.max = length;
  if (!previousDuration) {
    const entry = track.clips.find((saved) => validRange({ a: saved.a, b: Math.min(saved.b, duration) }, duration));
    if (entry) {
      editSavedClip(entry);
      media.setRate(effectiveSpeed(clip.speed));
    } else {
      clip = newClip(duration);
    }
    ui.settings.disabled = false;
    ui['clip-tools'].disabled = false;
    showClip();
    markSaved();
    renderLists();
  } else {
    // YouTube may replace its initial whole-second duration once playback begins.
    const end = trackEnd(clip.b, previousDuration, duration);
    if (end !== clip.b) {
      const clean = !unsaved();
      clip.b = end;
      ui['mark-b-time'].value = end;
      if (clean) markSaved();
    }
  }
  drawRange();
}

function reportPlayerError(message) {
  resetPractice();
  say('source-status', message, true);
}

async function openTrack(info, audioFile, confirmed = false) {
  if (!confirmed && !confirmDiscard()) return;
  recentRequest = undefined;
  load?.abort();
  load = new AbortController();
  const controller = load;
  const { signal } = controller;
  resetPractice();
  media?.destroy();
  media = undefined;
  loading = true;
  track = undefined;
  duration = 0;
  selected = undefined;
  clip = newClip(null);
  speeds = [];
  scrubbing = false;
  file = audioFile;
  ui.transport.disabled = true;
  ui.settings.disabled = true;
  ui['clip-tools'].disabled = true;
  ui['retain-wrap'].hidden = true;
  ui['retain-audio'].disabled = false;
  ui['track-title'].textContent = info.title;
  ui['original-link'].hidden = info.kind !== 'youtube';
  if (info.kind === 'youtube') ui['original-link'].href = `https://www.youtube.com/watch?v=${info.videoId}`;
  ui['media-host'].dataset.kind = info.kind;
  const loadingText = document.createElement('p');
  loadingText.textContent = '正在載入…';
  ui['media-host'].replaceChildren(loadingText);
  ui.timeline.value = 0;
  ui.timeline.max = 0;
  ui.position.textContent = timeLabel(0);
  ui.duration.textContent = timeLabel(0);
  say('source-status', '正在載入…');
  say('clip-status');
  say('storage-status');
  showClip();
  markSaved();
  renderLists();

  const adapter = info.kind === 'youtube'
    ? createYouTube(ui['media-host'], info.videoId, (message) => {
        if (!signal.aborted) reportPlayerError(message);
      }, () => {
        if (!signal.aborted) reportPlayerError('瀏覽器阻擋了自動起播。請先按影片上的播放鍵，再按「從頭再來」。');
      })
    : createAudio(ui['media-host'], audioFile);
  media = adapter;
  try {
    await adapter.ready(signal);
    signal.throwIfAborted();
    track = library.find(({ id }) => id === info.id) ?? { ...info, clips: [] };
    if (!library.includes(track)) library.push(track);
    track.updatedAt = Date.now();
    persist();
    loading = false;
    refreshRates();
    displayDuration();
    if (!duration && track.clips.length) {
      editSavedClip(track.clips[0]);
      showClip();
      markSaved();
    }
    ui.transport.disabled = false;
    ui['retain-wrap'].hidden = info.kind !== 'audio';
    ui['retain-audio'].checked = !!track.retained;
    renderLists();
    say('source-status');
  } catch (error) {
    if (signal.aborted) return;
    adapter.destroy();
    media = undefined;
    loading = false;
    const empty = document.createElement('p');
    empty.textContent = '請重新載入或選擇其他曲子。';
    ui['media-host'].dataset.kind = 'empty';
    ui['media-host'].replaceChildren(empty);
    say('source-status', error.message, true);
  }
}

function videoInfo(videoId) {
  return { id: `youtube:${videoId}`, videoId, kind: 'youtube', title: `YouTube · ${videoId}` };
}

function audioInfo(audioFile) {
  return { id: `audio:${audioFile.name}:${audioFile.size}:${audioFile.lastModified}`, kind: 'audio', title: audioFile.name };
}

async function openRecent(entry) {
  if (entry.kind === 'youtube') {
    if (!confirmDiscard()) return;
    ui['youtube-url'].value = `https://www.youtube.com/watch?v=${entry.videoId}`;
    return openTrack(entry, undefined, true);
  }
  if (entry.id === track?.id) return;
  const request = Symbol();
  recentRequest = request;
  try {
    const savedFile = entry.retained && await storedAudio(entry.id);
    if (recentRequest !== request) return;
    if (savedFile) return openTrack(entry, savedFile);
  } catch {
    if (recentRequest !== request) return;
  }
  say('source-status', `請重新選擇「${entry.title}」，即可叫回原本的片段。`);
  ui['audio-file'].focus();
}

function mark(which, value = media?.time()) {
  if (!duration || !Number.isFinite(value)) return;
  const time = Math.round(value * 100) / 100;
  clip[which] = Math.min(duration, Math.max(0, time));
  ui[`mark-${which}-time`].value = clip[which];
  drawRange();
}

async function playRound(repeat = false) {
  stopSequence();
  const controller = new AbortController();
  sequence = controller;
  armed = false;
  const { signal } = controller;
  const adapter = media;
  const gap = repeat ? clip.gap : 0;
  const countIn = clip.countIn === 'each' || (!repeat && clip.countIn === 'start');
  const { a } = clip;
  try {
    adapter.setRate(rate);
    if (countIn || gap) {
      adapter.pause();
      say('play-state', gap ? `等待 ${gap} 秒…` : '準備起點…');
      await Promise.all([adapter.prepare(a, signal), delay(gap * 1000, signal)]);
      if (countIn) {
        say('play-state', '數到 4 後播放');
        await playCountIn((beat) => say('beat', String(beat)), signal);
      }
    } else {
      adapter.seek(a);
    }
    signal.throwIfAborted();
    say('beat');
    say('play-state', '開始播放…');
    await adapter.play();
    for (let attempt = 0; attempt < 40 && !adapter.advancing(); attempt++) await delay(45, signal);
    if (!adapter.active() && !adapter.advancing()) throw new Error('播放尚未開始，請重試。');
    // YouTube applies a new rate a moment later, so show the rate this round asked for.
    say('play-state', clip.loop ? `第 ${rounds + 1} 輪 · ${rate}×` : '播放中');
  } catch (error) {
    if (signal.aborted) return;
    practicing = false;
    adapter.pause();
    say('beat');
    say('play-state', error.message, true);
  } finally {
    if (sequence === controller) sequence = undefined;
  }
}

function startPractice() {
  if (!media || loading) return;
  if (duration && !validRange(clip, duration) && clip.loop) return say('play-state', '請先修正 A、B 點。', true);
  if (!Number.isFinite(clip.a) || (duration && clip.a >= duration)) return say('play-state', '請先設定有效的起點 A。', true);
  rate = effectiveSpeed(clip.speed);
  practicing = true;
  rounds = 0;
  if (clip.countIn !== 'off') unlockCountInAudio();
  playRound();
}

function togglePlayback() {
  if (!media || loading) return;
  if (sequence || media.active()) {
    if (sequence) {
      stopSequence();
      practicing = false;
    }
    media.pause();
    say('play-state', '已暫停');
  } else if (practicing && !media.ended()) {
    Promise.resolve(media.play()).catch((error) => say('play-state', error.message, true));
    say('play-state', '播放中');
  } else {
    startPractice();
  }
}

let lastPoll = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (loading || !media) return;
  if (now - lastPoll > 220) {
    refreshRates();
    displayDuration();
    showCurrentRate();
    lastPoll = now;
  }
  const position = media.time();
  if (!scrubbing) {
    ui.timeline.value = position;
    const label = timeLabel(position);
    if (ui.position.textContent !== label) ui.position.textContent = label;
  }
  const active = media.active();
  const label = sequence ? '停止' : active ? '暫停' : practicing && !media.ended() ? '繼續播放' : '開始練習';
  if (ui.play.textContent !== label) ui.play.textContent = label;
  if (sequence || scrubbing || !practicing) return;
  if (position + 0.005 < clip.b) armed = true;
  if (armed && clip.loop && validRange(clip, duration) && (media.advancing() || media.ended()) && position + 0.005 >= clip.b) {
    rounds++;
    rate = nextSpeed(clip, rate, rounds, speeds);
    playRound(true);
  } else if (media.ended()) {
    practicing = false;
    say('play-state', '播放完畢');
  }
}

ui['youtube-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const id = youtubeId(ui['youtube-url'].value);
  if (id) openTrack(videoInfo(id));
  else say('source-status', '請貼上有效的 YouTube 影片連結。', true);
});

ui['audio-file'].addEventListener('change', () => {
  const chosen = ui['audio-file'].files[0];
  ui['audio-file'].value = '';
  if (chosen) openTrack(audioInfo(chosen), chosen);
});

ui['retain-audio'].addEventListener('change', async () => {
  if (track?.kind !== 'audio' || !file) return;
  const entry = track;
  const chosen = file;
  const retained = ui['retain-audio'].checked;
  const operation = Symbol();
  retainOperation = operation;
  ui['retain-audio'].disabled = true;
  say('storage-status', retained ? '正在保留音檔…' : '正在移除保留的音檔…');
  try {
    await storedAudio(entry.id, retained ? chosen : null);
    entry.retained = retained;
    const saved = persist();
    if (retainOperation !== operation) return;
    renderLists();
    if (track === entry && saved) say('storage-status', retained ? '已將音檔保留在此瀏覽器。' : '已移除保留的音檔，片段設定仍可使用。');
  } catch {
    if (track === entry && retainOperation === operation) {
      ui['retain-audio'].checked = !!entry.retained;
      say('storage-status', '無法更新保留的音檔。請確認瀏覽器有可用空間。', true);
    }
  } finally {
    if (track === entry && retainOperation === operation) ui['retain-audio'].disabled = false;
  }
});

ui.play.addEventListener('click', togglePlayback);
ui.restart.addEventListener('click', startPractice);
ui['mark-a'].addEventListener('click', () => mark('a'));
ui['mark-b'].addEventListener('click', () => mark('b'));
for (const which of ['a', 'b']) {
  const input = ui[`mark-${which}-time`];
  input.addEventListener('input', () => {
    clip[which] = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null;
    drawRange();
  });
}
for (const button of document.querySelectorAll('[data-nudge]')) {
  button.addEventListener('click', () => mark(button.dataset.nudge, (clip[button.dataset.nudge] ?? 0) + Number(button.dataset.delta)));
}

ui.timeline.addEventListener('input', () => {
  scrubbing = true;
  ui.position.textContent = timeLabel(ui.timeline.valueAsNumber);
});
ui.timeline.addEventListener('change', () => {
  const position = ui.timeline.valueAsNumber;
  scrubbing = false;
  if (practicing && clip.loop && validRange(clip, duration) && position >= clip.a && position <= clip.b) {
    media.seek(position);
    return;
  }
  const wasPreparing = !!sequence;
  stopSequence();
  if (wasPreparing) media?.pause();
  practicing = false;
  media?.seek(position);
  say('play-state');
});
ui.timeline.addEventListener('pointercancel', () => { scrubbing = false; });

for (const [id, field, min, max, fallback, integer] of [
  ['gap', 'gap', 0, 60, 0, false],
  ['ramp', 'ramp', 0, 99, 0, true],
]) {
  ui[id].addEventListener('change', () => {
    clip[field] = readNumber(id, min, max, fallback, integer);
    ui[id].value = clip[field] ?? '';
  });
}

ui.speed.addEventListener('input', () => {
  const value = ui.speed.valueAsNumber;
  clip.speed = track.kind === 'youtube' ? speeds[value] : value;
  rate = clip.speed;
  media.setRate(rate);
  showCurrentRate();
});
ui.ceiling.addEventListener('change', () => { clip.ceiling = Number(ui.ceiling.value); });
ui['count-in'].addEventListener('change', () => {
  clip.countIn = ui['count-in'].value;
  if (clip.countIn === 'each') unlockCountInAudio();
});
ui['loop-enabled'].addEventListener('change', () => {
  clip.loop = ui['loop-enabled'].checked;
  if (clip.loop || !sequence || !rounds || !validRange(clip, duration)) return;
  stopSequence();
  media.seek(clip.b);
  Promise.resolve(media.play()).catch((error) => say('play-state', error.message, true));
  say('play-state', '播放中');
});
ui['original-bpm'].addEventListener('input', showTempo);
ui['original-bpm'].addEventListener('change', () => {
  if (!track) return;
  const bpm = readNumber('original-bpm', 20, 400);
  if (selected) {
    clip.bpm = bpm;
  } else {
    track.bpm = bpm;
    persist();
  }
  ui['original-bpm'].value = clip.bpm ?? track.bpm ?? '';
  showTempo();
});

window.addEventListener('beforeunload', (event) => {
  if (!unsaved()) return;
  event.preventDefault();
  event.returnValue = '';
});

ui.save.addEventListener('click', () => saveClip());
ui['save-new'].addEventListener('click', () => saveClip(true));
document.addEventListener('keydown', (event) => {
  if (!media || loading || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === ' ' && event.target.closest('button, a')) return;
  const actions = { ' ': togglePlayback, a: () => mark('a'), b: () => mark('b'), r: startPractice };
  const action = actions[event.key.toLowerCase()];
  if (typeof action !== 'function') return;
  event.preventDefault();
  action();
});

// Registered last, so the hint reflects edits made by the handlers above.
for (const type of ['input', 'change', 'click', 'keydown']) {
  document.addEventListener(type, () => { ui['clip-dirty'].hidden = !unsaved(); });
}

showClip();
renderLists();
ui['load-video'].disabled = false;
ui['audio-file'].disabled = false;
requestAnimationFrame(tick);
