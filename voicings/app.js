import { ROOTS } from '../src/music.js';
import { CHORD_TYPES, chordSymbol, formatNote, lookupChord, parseChordQuery } from './catalog.js';
import { playNotes } from './audio.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
let database;

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function playButton(label, notes, spacing, className = '') {
  const button = element('button', label, className);
  button.type = 'button';
  button.addEventListener('click', async () => {
    ui['audio-status'].textContent = '';
    try {
      await playNotes(notes, spacing);
    } catch (error) {
      ui['audio-status'].textContent = error.message;
    }
  });
  return button;
}

function diagram(voicing) {
  const { strings, barres, baseFret } = voicing;
  const rows = [...strings].reverse();
  const fretCount = Math.max(4, ...strings.map(({ relative }) => relative));
  const stringPosition = (number) => (number - 1) * 100 / (strings.length - 1);
  const fretCenter = (relative) => `${(relative - 0.5) * 100 / fretCount}%`;
  const board = element('div', '', 'voicing-diagram');
  const statuses = element('div', '', 'string-statuses');
  statuses.setAttribute('aria-hidden', 'true');
  const neck = element('div', '', 'diagram-neck');
  neck.setAttribute('role', 'img');
  neck.setAttribute('aria-label', rows.map(({ number, fret, finger }) => (
    `第 ${number} 弦${fret < 0 ? '不彈' : fret === 0 ? '空弦' : `第 ${fret} 格${finger ? `用第 ${finger} 指` : ''}`}`
  )).join('、'));
  const stringNotes = element('div', '', 'string-notes');
  const fretLabels = element('div', '', 'fret-labels');
  fretLabels.style.setProperty('--fret-count', fretCount);

  for (const { number, fret, midi, name } of rows) {
    const status = element('span', fret < 0 ? '×' : fret === 0 ? '○' : '');
    statuses.append(status);
    const line = element('span', '', 'diagram-string');
    line.dataset.string = number;
    line.style.top = `${stringPosition(number)}%`;
    neck.append(line);

    if (midi === null) {
      stringNotes.append(element('span'));
    } else {
      const button = playButton(formatNote(name), [midi], 0, 'string-note');
      button.setAttribute('aria-label', `試聽第 ${number} 弦 ${formatNote(name)}`);
      stringNotes.append(button);
    }
  }
  for (let edge = 0; edge <= fretCount; edge++) {
    const isNut = edge === 0 && baseFret === 1;
    const line = element('span', '', isNut ? 'diagram-fret diagram-nut' : 'diagram-fret');
    line.style.left = `${edge * 100 / fretCount}%`;
    neck.append(line);
    if (edge < fretCount) fretLabels.append(element('span', String(baseFret + edge)));
  }
  const barredStrings = new Set();
  for (const relative of barres) {
    for (const finger of [1, 2, 3, 4]) {
      const pressed = rows.filter((string) => string.relative === relative && string.finger === finger);
      if (pressed.length < 2) continue;
      const first = stringPosition(pressed[0].number);
      const last = stringPosition(pressed.at(-1).number);
      const barre = element('span', '', 'barre-span');
      barre.dataset.finger = finger;
      barre.dataset.fret = baseFret + relative - 1;
      barre.style.left = fretCenter(relative);
      barre.style.setProperty('--start', `${first}%`);
      barre.style.setProperty('--length', `${last - first}%`);
      barre.append(element('span', String(finger)));
      neck.append(barre);
      for (const { number } of pressed) barredStrings.add(number);
    }
  }
  for (const { number, fret, relative, finger } of rows) {
    if (relative < 1 || barredStrings.has(number)) continue;
    const marker = element('span', String(finger || ''), 'finger-marker');
    marker.dataset.string = number;
    marker.dataset.fret = fret;
    marker.style.left = fretCenter(relative);
    marker.style.top = `${stringPosition(number)}%`;
    neck.append(marker);
  }
  board.append(statuses, neck, stringNotes, fretLabels);
  return board;
}

function voicingCard(voicing, index) {
  const card = element('article', '', 'voicing-card');
  const lowest = formatNote(voicing.lowest.name);
  const position = voicing.baseFret === 1 && voicing.strings.some(({ fret }) => fret === 0) ? '開放把位' : `第 ${voicing.baseFret} 格起`;
  card.append(
    element('h3', `指法 ${index + 1} · ${position}`),
    element('p', `${voicing.positions}　低音 ${lowest}`, 'position-text'),
    diagram(voicing),
  );
  const notes = voicing.strings.flatMap(({ midi }) => midi === null ? [] : [midi]);
  const actions = element('div', '', 'voicing-actions');
  actions.append(playButton('刷奏', notes, 0.018, 'voicing-primary'), playButton('逐弦試聽', notes, 0.2));
  card.append(actions);
  return card;
}

function render(query) {
  const result = lookupChord(database, query);
  ui['found-chord'].textContent = `${result.symbol} · ${result.typeLabel}`;
  ui['chord-tones'].textContent = `組成音 ${result.tones.join(' · ')}${query.bass ? `　指定低音 ${formatNote(query.bass)}` : ''}`;
  ui['lookup-status'].textContent = result.positions.length
    ? `找到 ${result.positions.length} 種指法。`
    : '資料庫沒有這個和弦組合的指法。';
  ui['diagram-legend'].hidden = !result.positions.length;
  ui['voicing-grid'].replaceChildren(...result.positions.map(voicingCard));
  ui.results.hidden = false;
}

function fillControls() {
  for (const id of ['root', 'bass']) {
    const options = ROOTS.map((note) => new Option(formatNote(note), note));
    if (id === 'bass') options.unshift(new Option('不限低音', ''));
    ui[id].replaceChildren(...options);
  }
  const types = CHORD_TYPES.map(({ id, label, symbol }) => new Option(symbol ? `${label} · ${formatNote(symbol)}` : label, id));
  ui.quality.replaceChildren(...types);
}

function choose(query) {
  ui.root.value = query.root;
  ui.quality.value = query.type;
  ui.bass.value = query.bass;
  ui['chord-query'].value = chordSymbol(query);
  ui['audio-status'].textContent = '';
  render(query);
}

for (const id of ['root', 'quality', 'bass']) {
  ui[id].addEventListener('change', () => choose({ root: ui.root.value, type: ui.quality.value, bass: ui.bass.value }));
}

ui['chord-lookup'].addEventListener('submit', (event) => {
  event.preventDefault();
  const query = parseChordQuery(ui['chord-query'].value);
  if (query) choose(query);
  else {
    ui.results.hidden = true;
    ui['lookup-status'].textContent = '這個和弦名稱目前無法辨識。可試 Am7、D/F#，或選擇下方的條件。';
  }
});

try {
  const response = await fetch('./guitar.json');
  if (!response.ok) throw new Error('Chord data failed to load');
  database = await response.json();
  fillControls();
  choose({ root: 'C', type: 'maj', bass: '' });
  ui['lookup-controls'].disabled = false;
} catch {
  ui['lookup-status'].textContent = '目前無法讀取指法資料，請重新整理這個頁面。';
}
