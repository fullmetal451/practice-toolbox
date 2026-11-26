import { answerPitches, fretboardPositions, pitchName, shufflePositions } from './practice.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
const stringNumbers = [1, 2, 3, 4, 5, 6];
const fretMarkers = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const questionCount = 20;
let session;
let timeout;
let clock;
let advance;

function stopTimers() {
  clearInterval(clock);
  clearTimeout(timeout);
  clearTimeout(advance);
}

function show(view) {
  for (const section of ['setup', 'question', 'summary']) ui[section].hidden = section !== view;
  ui[`${view}-heading`].focus();
}

function positionName({ stringNumber, fret }) {
  return fret ? `第 ${stringNumber} 弦第 ${fret} 格` : `第 ${stringNumber} 弦空弦`;
}

function makeCell(text, className) {
  const cell = document.createElement('span');
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderNeck() {
  const { from, to, strings } = session.config;
  const position = session.position;
  const columns = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const cells = [makeCell('弦', 'neck-label neck-corner')];
  ui.neck.style.setProperty('--frets', columns.length);
  ui.neck.setAttribute('aria-label', `標記位置為${positionName(position)}。指板最上面是第 1 弦。`);
  for (const fret of columns) {
    cells.push(makeCell(String(fret), fretMarkers.has(fret) ? 'fret-number fret-marker' : 'fret-number'));
  }
  for (const stringNumber of stringNumbers) {
    cells.push(makeCell(String(stringNumber), 'neck-label'));
    for (const fret of columns) {
      const cell = makeCell('', 'neck-cell');
      if (!strings.includes(stringNumber)) cell.classList.add('excluded-string');
      if (!fret) cell.classList.add('open-string');
      if (fretMarkers.has(fret)) cell.classList.add('marked-fret');
      if (position.stringNumber === stringNumber && position.fret === fret) {
        cell.append(makeCell('●', 'question-marker'));
      }
      cells.push(cell);
    }
  }
  ui.neck.replaceChildren(...cells);
  const marker = ui.neck.querySelector('.question-marker');
  requestAnimationFrame(() => {
    if (!marker.isConnected || ui.question.hidden) return;
    const scroller = ui['neck-scroll'];
    const offset = marker.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollLeft += offset - (scroller.clientWidth - marker.offsetWidth) / 2;
  });
}

function formatTime(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)} 秒`;
}

function nextQuestion() {
  stopTimers();
  if (session.mode === 'test' && session.results.length >= questionCount) return finish();
  if (!session.deck.length) session.deck = shufflePositions(session.pool, session.position);
  session.position = session.deck.pop();
  session.answered = false;
  ui.feedback.textContent = '';
  ui.feedback.className = '';
  ui.next.hidden = true;
  const mode = { practice: '自由練習', test: '測驗', retry: '錯題練習' }[session.mode];
  const current = session.results.length + 1;
  ui['question-progress'].textContent = `${mode} · 第 ${current}${session.mode === 'test' ? `／${questionCount}` : ''} 題`;
  renderNeck();
  ui.answers.replaceChildren(...answerPitches(session.config.naturalOnly).map((pitch) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = pitchName(pitch, session.config.notation);
    button.dataset.pitch = pitch;
    button.addEventListener('click', () => answer(pitch));
    return button;
  }));
  show('question');
  session.started = performance.now();
  const limit = session.config.limit * 1000;
  ui.timer.hidden = !limit;
  if (limit) {
    const update = () => { ui.timer.textContent = `剩餘 ${formatTime(Math.max(0, session.started + limit - performance.now()))}`; };
    update();
    clock = setInterval(update, 100);
    timeout = setTimeout(() => answer(null), limit);
  }
}

function answer(pitch) {
  if (session.answered) return;
  stopTimers();
  const elapsed = performance.now() - session.started;
  if (session.config.limit && elapsed >= session.config.limit * 1000) pitch = null;
  const position = session.position;
  const correct = pitch === position.pitch;
  session.answered = true;
  session.results.push({ position, pitch, correct, elapsed });
  const name = pitchName(position.pitch, session.config.notation);
  const marker = ui.neck.querySelector('.question-marker');
  marker.textContent = name.replace(' / ', '\n');
  marker.classList.add('revealed');
  ui.neck.setAttribute('aria-label', `${positionName(position)}是${name}。`);
  for (const button of ui.answers.querySelectorAll('button')) {
    const value = Number(button.dataset.pitch);
    button.disabled = true;
    if (value === position.pitch) button.dataset.result = 'correct';
    else if (value === pitch) button.dataset.result = 'wrong';
  }
  const result = correct ? '答對了' : pitch === null ? '時間到' : '答錯了';
  ui.feedback.textContent = `${result}，${positionName(position)}是 ${name}。`;
  ui.feedback.className = correct ? 'correct' : 'wrong';
  const last = session.mode === 'test' && session.results.length === questionCount;
  ui.next.textContent = last ? '看測驗結果' : '下一題';
  ui.next.hidden = false;
  ui.next.focus();
  if (session.config.advance) advance = setTimeout(nextQuestion, session.config.advance * 1000);
}

function begin(mode, config, pool) {
  session = { mode, config, pool, deck: [], position: null, results: [], answered: false, started: 0 };
  nextQuestion();
}

function finish() {
  stopTimers();
  const { mode, results, config } = session;
  const correct = results.filter((result) => result.correct);
  const wrong = results.filter((result) => !result.correct);
  ui['summary-heading'].textContent = mode === 'test' ? '測驗結果' : '練習結果';
  const total = results.length;
  const accuracy = total ? ` · 正確率 ${Math.round(100 * correct.length / total)}%` : '';
  ui.score.textContent = `答對 ${correct.length} 題 · 已答 ${total}${mode === 'test' ? `／${questionCount}` : ''} 題${accuracy}`;
  const mean = correct.length ? correct.reduce((sum, result) => sum + result.elapsed, 0) / correct.length : null;
  ui['speed-summary'].textContent = mean === null ? '' : `答對的題目平均用時 ${formatTime(mean)}`;
  ui.mistakes.replaceChildren(...wrong.map(({ position, pitch }) => {
    const row = document.createElement('li');
    const expected = pitchName(position.pitch, config.notation);
    const response = pitch === null ? '時間到' : `你選 ${pitchName(pitch, config.notation)}`;
    row.textContent = `${positionName(position)} · 正解 ${expected} · ${response}`;
    return row;
  }));
  ui['mistakes-heading'].hidden = !wrong.length;
  ui.retry.hidden = !wrong.length;
  show('summary');
}

ui['setup-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(ui['setup-form']);
  const config = {
    strings: form.getAll('strings').map(Number),
    from: Number(form.get('from')),
    to: Number(form.get('to')),
    naturalOnly: form.get('notes') === 'natural',
    notation: form.get('notation'),
    limit: Number(form.get('limit')),
    advance: Number(form.get('advance')),
  };
  const pool = fretboardPositions(config);
  if (!pool.length) {
    ui['setup-error'].textContent = !config.strings.length ? '請至少選一根弦。' : config.from > config.to ? '結束格必須大於或等於起始格。' : '這個範圍沒有符合設定的音。';
    return;
  }
  ui['setup-error'].textContent = '';
  begin(event.submitter?.dataset.mode ?? 'practice', config, pool);
});

ui.next.addEventListener('click', nextQuestion);
ui.finish.addEventListener('click', finish);
ui.retry.addEventListener('click', () => {
  const wrongPositions = session.results.filter(({ correct }) => !correct).map(({ position }) => position);
  begin('retry', session.config, [...new Set(wrongPositions)]);
});
ui.settings.addEventListener('click', () => show('setup'));
