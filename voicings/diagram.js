import { formatNote } from './catalog.js';

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// Chord box with string 1 on top. `noteLabel` builds each string's note label; pass null to leave the column out.
export function diagram(voicing, { noteLabel = (string) => element('span', formatNote(string.name), 'string-note') } = {}) {
  const { strings, barres, baseFret } = voicing;
  const rows = [...strings].reverse();
  const fretCount = Math.max(4, ...strings.map(({ relative }) => relative));
  const stringPosition = (number) => (number - 1) * 100 / (strings.length - 1);
  const fretCenter = (relative) => `${(relative - 0.5) * 100 / fretCount}%`;
  const board = element('div', '', noteLabel ? 'voicing-diagram' : 'voicing-diagram no-notes');
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

  for (const string of rows) {
    const { number, fret, midi } = string;
    statuses.append(element('span', fret < 0 ? '×' : fret === 0 ? '○' : ''));
    const line = element('span', '', 'diagram-string');
    line.dataset.string = number;
    line.style.top = `${stringPosition(number)}%`;
    neck.append(line);
    if (noteLabel) stringNotes.append(midi === null ? element('span') : noteLabel(string));
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
  board.append(statuses, neck);
  if (noteLabel) board.append(stringNotes);
  board.append(fretLabels);
  return board;
}

export function positionLabel(voicing) {
  return voicing.baseFret === 1 && voicing.strings.some(({ fret }) => fret === 0) ? '開放把位' : `第 ${voicing.baseFret} 格起`;
}
