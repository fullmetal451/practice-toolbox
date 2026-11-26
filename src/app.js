import {
  CHORD_TEMPLATES,
  FRETBOARD_TAB_ORDER,
  buildChord,
  explainChordStack,
  fretboardCells,
  gradeNotes,
  randomQuestion,
  rootNamesForAccidentals,
  templateSymbol,
} from './music.js';
import { createDefaultPracticeConfig } from './practice-config.js';
import {
  applyAnswerKey,
  createAnswerGrid,
  moveFocus,
  notesFromGrid,
} from './answer-grid.js';
import {
  createPracticeSession,
  feedbackKeyboardAction,
  nextActionAfterFeedback,
  recordQuestionResult,
  sessionScore,
} from './session.js';

const app = document.querySelector('[data-app-root]');
const allTemplateIds = CHORD_TEMPLATES.map((template) => template.id);
const APP_VERSION = 'v1.3.1';
const RELEASE_HISTORY = [
  {
    version: 'v1.3.1',
    date: '2026.08.28',
    title: '結算錯題也能複習',
    changes: ['每張錯題卡加入組成規律', '保留相鄰音程的全音與半音說明', '延伸音持續標示為上方八度'],
  },
  {
    version: 'v1.3.0',
    date: '2026.08.28',
    title: '看懂和弦怎麼堆疊',
    changes: ['答題後加入組成規律說明', '以相鄰兩音標示全音與半音距離', '延伸音另標示為上方八度'],
  },
  {
    version: 'v1.2.0',
    date: '2026.08.15',
    title: '更適合從基礎開始',
    changes: ['預設為看和弦填組成音與自然根音', '答題後指板只顯示本題組成音', '根音以粗體與外框特別標示'],
  },
  {
    version: 'v1.1.0',
    date: '2026.08.15',
    title: '答題與複習更順手',
    changes: ['加入手機音名按鍵與鍵盤輸入規則', '可設定答題數、查看成績與錯題', '答題後按 Enter 可進入下一題'],
  },
  {
    version: 'v1.0.0',
    date: '2026.08.14',
    title: '和弦組成音練習器公開',
    changes: ['建立基本、延伸與變化和弦題庫', '提供正向、反向與混合練習', '支援限時、嚴格音名拼寫與吉他指板'],
  },
];
const typeGroupSpecs = [
  {
    section: '基本和弦',
    groups: [
      { category: '三和弦', ids: ['maj', 'min', 'aug', 'dim'] },
      { category: '七和弦', ids: ['maj7', 'min7', '7', 'dim7', 'm7b5', 'minMaj7', 'augMaj7'] },
      { category: '六和弦', ids: ['6', 'm6'] },
      { category: '加九和弦', ids: ['add9', 'madd9'] },
      { category: '掛留和弦', ids: ['sus2', 'sus4', '7sus4'] },
      { category: '六九和弦', ids: ['69', 'm69'] },
    ],
  },
  {
    section: '延伸和弦',
    groups: [
      { category: '九和弦', ids: ['maj9', 'min9', '9'] },
      { category: '十一和弦', ids: ['maj11', 'min11', '11'] },
      { category: '十三和弦', ids: ['maj13', 'min13', '13'] },
    ],
  },
  {
    section: '變化和弦',
    groups: [
      { category: '變化和弦', ids: ['7s9', '7b9', '7b5s9', '7s5b9', '9s5', '9b5', '7s5', 'm7s5', '7b5'] },
    ],
  },
];
const state = {
  view: 'setup',
  config: createDefaultPracticeConfig(),
  session: null,
  question: null,
  previousKey: '',
  direction: 'forward',
  answerGrid: [],
  rootGrid: [],
  reverseTemplateId: '',
  focus: { column: 0 },
  focusGrid: 'answer',
  feedback: null,
  fretboardOpen: false,
  setupFretboardOpen: false,
  releaseHistoryOpen: false,
  timerId: null,
  deadline: null,
  setupError: '',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function chordGroups() {
  return typeGroupSpecs.map(({ section, groups }) => ({
    section,
    groups: groups.map(({ category, ids }) => ({
      category,
      templates: ids.map((id) => CHORD_TEMPLATES.find((template) => template.id === id)),
    })),
  }));
}

function renderShell(content) {
  const homeMeta = state.view === 'setup' ? `<div class="masthead-meta"><p class="muted">純理論練習 · 不保存紀錄</p><div class="version-row"><span class="version-status">目前版本 <b>${APP_VERSION}</b></span><button class="release-history-toggle" type="button" data-action="toggle-release-history" aria-expanded="${state.releaseHistoryOpen}" aria-controls="release-history-panel">版本更新歷程 <span aria-hidden="true">${state.releaseHistoryOpen ? '−' : '+'}</span></button></div></div>` : '<p class="muted">純理論練習 · 不保存紀錄</p>';
  return `<div class="app-shell">
    <header class="masthead">
      <div><p class="eyebrow">HARMONY WORKBENCH / 01</p><h1>和弦組成音<br>練習器</h1><p class="subhead">用正確拼寫，拆開每一個和弦。</p></div>
      ${homeMeta}
    </header>${state.view === 'setup' && state.releaseHistoryOpen ? renderReleaseHistory() : ''}${content}
  </div>`;
}

function renderReleaseHistory() {
  const entries = RELEASE_HISTORY.map((release) => `<li class="release-entry"><div class="release-marker"><strong>${release.version}</strong><span>${release.date}</span></div><div><h3>${release.title}</h3><ul>${release.changes.map((change) => `<li>${change}</li>`).join('')}</ul></div></li>`).join('');
  return `<section class="release-history" id="release-history-panel" aria-labelledby="release-history-title"><header><div><p class="eyebrow">VERSION LOG</p><h2 id="release-history-title">版本更新歷程</h2></div><p>功能會持續整理成好理解的練習工具。</p></header><ol>${entries}</ol></section>`;
}

function renderSetup() {
  const selected = new Set(state.config.templateIds);
  const selectedRootAccidentals = new Set(state.config.rootAccidentals);
  const types = chordGroups().map(({ section, groups }, index) => {
    const typeCount = groups.reduce((total, group) => total + group.templates.length, 0);
    const sectionClass = ['section-basic', 'section-extended', 'section-altered'][index];
    return `<section class="type-section ${sectionClass}" aria-labelledby="section-${index}">
    <header class="type-section-head"><div><p class="section-index">0${index + 1}</p><h3 id="section-${index}">${section}</h3></div><span class="type-count">${typeCount} 種</span></header>
    <div class="section-groups">
    ${groups.map(({ category, templates }) => `<div class="type-group">
      <h4>${category}</h4>
      <div class="type-list">${templates.map((template) => `<label><input class="type-check" type="checkbox" value="${template.id}" ${selected.has(template.id) ? 'checked' : ''} aria-label="${escapeHtml(template.label)}"><span><b>${escapeHtml(templateSymbol(template.id).replaceAll('b', '♭').replaceAll('#', '♯'))}</b><small>${escapeHtml(template.label)}</small></span></label>`).join('')}</div>
    </div>`).join('')}
    </div>
  </section>`;
  }).join('');
  return renderShell(`<section class="paper-panel setup">
    <header class="setup-intro">
      <div>
        <p class="eyebrow" style="color:#7a5126">SET THE SESSION</p>
        <h2>先決定你要練哪一種答案。</h2>
      </div>
      <p class="setup-copy">系統依完整理論堆疊出題，並嚴格判定音名字母與升降記號。</p>
    </header>
    <div class="setup-layout">
      <aside class="setup-controls" aria-label="練習設定">
        <section class="control-card">
          <p class="control-number">01</p>
          <h3>練習方向</h3>
          <div class="segment" role="radiogroup" aria-label="練習方向">
            ${[['forward', '看和弦填組成音'], ['reverse', '看組成音猜和弦'], ['mixed', '混合出題']].map(([value, label]) => `<label><input type="radio" name="mode" value="${value}" ${state.config.mode === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}
          </div>
        </section>
        <section class="control-card">
          <p class="control-number">02</p>
          <label class="field-label" for="duration">每題作答時間</label><select class="time-select" id="duration">
            <option value="0" ${state.config.duration === 0 ? 'selected' : ''}>不限時</option>
            ${Array.from({ length: 12 }, (_, index) => (index + 1) * 5).map((seconds) => `<option value="${seconds}" ${state.config.duration === seconds ? 'selected' : ''}>${seconds} 秒</option>`).join('')}
          </select>
        </section>
        <section class="control-card">
          <p class="control-number">03</p>
          <label class="field-label" for="question-count">答題數</label><select class="time-select" id="question-count">
            ${[5, 10, 15, 20, 30].map((count) => `<option value="${count}" ${state.config.questionCount === count ? 'selected' : ''}>${count} 題</option>`).join('')}
          </select>
        </section>
        <section class="control-card">
          <p class="control-number">04</p>
          <h3>根音記號</h3>
          <p class="setup-copy" style="margin:0 0 10px">選擇題目和弦的根音是否帶升降記號。</p>
          <div class="segment" role="group" aria-label="根音記號篩選">
            ${[['natural', '自然音'], ['sharp', '♯ 根音'], ['flat', '♭ 根音']].map(([value, label]) => `<label><input class="root-accidental-check" type="checkbox" value="${value}" ${selectedRootAccidentals.has(value) ? 'checked' : ''}><span>${label}</span></label>`).join('')}
          </div>
        </section>
      </aside>
      <section class="chord-selector" aria-labelledby="chord-selector-title">
        <div class="type-header"><div><span class="field-label" id="chord-selector-title">和弦類型</span><p class="setup-copy" style="margin:0">依和弦組成公式分為基本、延伸與變化。可從類別內挑選。</p></div><div class="type-actions"><button class="text-button" type="button" data-action="select-basic">基本</button><button class="text-button" type="button" data-action="select-all">全選</button><button class="text-button" type="button" data-action="select-none">清空</button></div></div>
        <div class="type-groups">${types}</div>
      </section>
    </div>
    <footer class="setup-footer">
      <div><p class="error-note" role="alert">${escapeHtml(state.setupError)}</p><p class="selection-summary ${selected.size ? '' : 'is-empty'}" aria-live="polite"><span>本次已選</span><strong>${selected.size}</strong><span>種和弦類型</span></p></div>
      <div class="setup-footer-actions"><button class="secondary-button" type="button" data-action="toggle-setup-fretboard">${state.setupFretboardOpen ? '收合指板對照' : '查看吉他指板音名'}</button><button class="primary-button" type="button" data-action="start">開始練習 →</button></div>
    </footer>
    ${state.setupFretboardOpen ? renderFretboardPanel([], '設定用吉他指板音名圖', '標準調弦 E A D G B E · 1–12 格 · 音名僅標示自然音') : ''}
  </section>`);
}

function renderAnswerGrid(grid, degrees, name) {
  const locked = Boolean(state.feedback);
  const header = degrees.map((degree) => `<div class="degree-head">${escapeHtml(degree.replaceAll('bb', '♭♭').replaceAll('b', '♭').replaceAll('#', '♯'))}</div>`).join('');
  const row = grid.map((entry, column) => {
    const active = state.focusGrid === name && state.focus.column === column;
    const display = `${entry.letter || '—'}${entry.accidental === 1 ? '♯' : entry.accidental === -1 ? '♭' : ''}`;
    return `<div class="note-slot">
      <button type="button" class="alter-button sharp" data-alter-key="+" data-grid="${name}" data-column="${column}" ${locked ? 'disabled' : ''} aria-label="${escapeHtml(degrees[column])}升半音">♯</button>
      <button type="button" class="grid-cell ${active ? 'is-active' : ''}" data-note-cell data-grid="${name}" data-column="${column}" tabindex="${active && !locked ? '0' : '-1'}" ${locked ? 'disabled' : ''} aria-label="${escapeHtml(degrees[column])}的音名：${display}">${display}</button>
      <button type="button" class="alter-button flat" data-alter-key="-" data-grid="${name}" data-column="${column}" ${locked ? 'disabled' : ''} aria-label="${escapeHtml(degrees[column])}降半音">♭</button>
    </div>`;
  }).join('');
  return `<div class="answer-grid-wrap"><div class="answer-grid" role="grid" style="--columns:${grid.length}">
    <div class="grid-label">度數</div>${header}
    <div class="grid-label">音名</div>${row}
  </div></div>`;
}

function renderNoteControls() {
  return `<div class="note-controls" aria-label="音名輸入按鍵"><div class="note-control-row"><span>音名</span>${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((letter) => `<button class="key-button" type="button" data-input-key="${letter}">${letter}</button>`).join('')}</div><div class="note-control-row"><span>升降</span><button class="key-button wide" type="button" data-input-key="-">♭</button><button class="key-button wide" type="button" data-input-key="+">♯</button></div></div>`;
}

function renderForwardInput() {
  return `<p class="prompt">請依照度數，由左至右填入組成音。</p>
    ${renderAnswerGrid(state.answerGrid, state.question.tones.map((tone) => tone.degree), 'answer')}
    <p class="input-hint">鍵盤：← → 移動；C–B 不分大小寫；+ 為升、- 為降。輸入下一個音名字母會自動前進。</p>
    ${renderNoteControls()}`;
}

function renderReverseInput() {
  const allowed = CHORD_TEMPLATES.filter((template) => state.config.templateIds.includes(template.id));
  return `<p class="prompt">先填根音，再選擇符合的和弦類型。</p>
    ${renderAnswerGrid(state.rootGrid, ['根音'], 'root')}
    <label class="reverse-select"><span>和弦類型</span><select id="reverse-template" ${state.feedback ? 'disabled' : ''}><option value="">請選擇…</option>${allowed.map((template) => `<option value="${template.id}" ${state.reverseTemplateId === template.id ? 'selected' : ''}>${escapeHtml(templateSymbol(template.id).replaceAll('b', '♭').replaceAll('#', '♯'))}　${escapeHtml(template.label)}</option>`).join('')}</select></label>
    <p class="input-hint">鍵盤：C–B 不分大小寫；+ 為升、- 為降。</p>
    ${renderNoteControls()}`;
}

function displayNotation(value) {
  return String(value).replaceAll('bb', '♭♭').replaceAll('b', '♭').replaceAll('#', '♯');
}

function renderFormulaStrip(question) {
  const formula = question.template.degrees.map(displayNotation).join(' · ');
  return `<div class="formula-strip"><span>和弦公式</span><strong>${escapeHtml(formula)}</strong><em>${escapeHtml(question.template.label)}</em></div>`;
}

function renderConstructionRule(question) {
  const explanation = explainChordStack(question);
  const roles = explanation.roles.map(({ degree, label, aboveRootOctave }) => `${displayNotation(degree)} ${label}${aboveRootOctave ? '（上方八度）' : ''}`).join(' · ');
  const steps = explanation.steps.map(({ from, to, interval, distance }, index) => {
    const upperOctave = explanation.roles[index + 1].aboveRootOctave ? '<em>上方八度</em>' : '';
    return `<li><strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong><span>${escapeHtml(interval)}（${escapeHtml(distance)}）</span>${upperOctave}</li>`;
  }).join('');
  return `<section class="construction-rule"><div><span>組成規律</span><p>由左到右，從前一音往上堆疊。</p></div><ol>${steps}</ol><p class="construction-roles">公式讀法：${escapeHtml(roles)}</p></section>`;
}

function renderMistakeConstructionRule(mistake) {
  return renderConstructionRule({
    tones: mistake.tones.map((name, index) => ({ name, degree: mistake.formula[index] })),
  });
}

function renderFeedback() {
  if (!state.feedback) return '';
  const { correct, timedOut } = state.feedback;
  let details = '';
  if (state.direction === 'forward') {
    details = `<ul class="correction-list">${state.feedback.result.entries.map((entry) => `<li><span>${escapeHtml(entry.degree)}</span><span class="${entry.correct ? 'right' : 'wrong'}">你的：${escapeHtml(entry.actual || '—')}</span><span class="right">正解：${escapeHtml(entry.expected)}</span></li>`).join('')}</ul>`;
  } else {
    const rootAnswer = notesFromGrid(state.rootGrid)[0] || '—';
    const chosen = state.reverseTemplateId ? CHORD_TEMPLATES.find((template) => template.id === state.reverseTemplateId)?.id ?? '—' : '—';
    details = `<ul class="correction-list"><li><span>根音</span><span class="${rootAnswer === state.question.root ? 'right' : 'wrong'}">你的：${escapeHtml(rootAnswer)}</span><span class="right">正解：${escapeHtml(state.question.root)}</span></li><li><span>類型</span><span class="${chosen === state.question.templateId ? 'right' : 'wrong'}">你的：${escapeHtml(chosen)}</span><span class="right">正解：${escapeHtml(state.question.templateId)}</span></li></ul>`;
  }
  const nextButton = nextActionAfterFeedback(state.session) === 'summary'
    ? '<button class="primary-button" type="button" data-action="summary">查看結算（Enter）→</button>'
    : '<button class="primary-button" type="button" data-action="next">下一題（Enter）→</button>';
  return `<section class="feedback ${correct ? '' : 'wrong'}" aria-live="polite"><p class="feedback-title">${timedOut ? '時間到。' : correct ? '正確。' : '再看一次正確拼寫。'}</p>${details}${renderFormulaStrip(state.question)}${renderConstructionRule(state.question)}<div class="feedback-actions"><button class="secondary-button" type="button" data-action="toggle-fretboard">${state.fretboardOpen ? '收合吉他指板' : '顯示吉他指板'}</button>${nextButton}</div></section>`;
}

function renderFretboardPanel(chordNotes, heading, detail) {
  const cells = fretboardCells(chordNotes);
  const isReferenceView = chordNotes.length === 0;
  const rows = FRETBOARD_TAB_ORDER.map((stringIndex) => {
    const stringCells = cells.filter((cell) => cell.stringIndex === stringIndex);
    const width = 1 + (5 - stringIndex) * 0.28;
    return `<div class="fret-row" style="--string-width:${width}px"><div class="fret-string">${stringCells[0].stringName}</div>${stringCells.map((cell) => `<div class="fret-cell ${cell.targetTone ? 'target' : ''}" title="第 ${cell.fret} 格：${cell.targetTone ? `本題組成音 ${cell.targetTone.name}` : cell.naturalName || '升降音位置'}">${cell.targetTone ? `<span class="fret-note target-note ${cell.isRoot ? 'root-note' : ''}">${escapeHtml(cell.targetTone.name)}</span>` : isReferenceView && cell.naturalName ? `<span class="fret-note">${escapeHtml(cell.naturalName)}</span>` : ''}</div>`).join('')}</div>`;
  }).join('');
  return `<section class="fretboard-panel"><div class="fretboard-title"><div><p class="eyebrow">FRETBOARD REFERENCE</p><h2>${escapeHtml(heading)}</h2></div><p>${escapeHtml(detail)}</p></div><div class="fretboard-scroll"><div class="fretboard">${rows}</div><div class="fret-numbers"><span>弦</span>${Array.from({ length: 12 }, (_, index) => `<span>${index + 1}</span>`).join('')}</div></div></section>`;
}

function renderFretboard() {
  if (!state.feedback || !state.fretboardOpen) return '';
  return renderFretboardPanel(state.question.tones, '吉他指板音名圖', '第 1–12 格 · 僅顯示本題組成音 · 根音以粗體外框標示');
}

function renderSummary() {
  const score = sessionScore(state.session);
  const mistakes = state.session.mistakes.map((mistake, index) => `<article class="mistake-card"><div><p class="mistake-index">錯題 ${index + 1}</p><h3>${escapeHtml(displayNotation(mistake.symbol))}</h3><p>${escapeHtml(mistake.label)}</p></div><div><p class="mistake-detail"><span>公式</span>${escapeHtml(mistake.formula.map(displayNotation).join(' · '))}</p><p class="mistake-detail"><span>組成音</span>${escapeHtml(mistake.tones.map(displayNotation).join(' · '))}</p>${renderMistakeConstructionRule(mistake)}</div></article>`).join('');
  return renderShell(`<section class="paper-panel summary-panel">
    <header class="summary-heading"><p class="eyebrow" style="color:#7a5126">SESSION COMPLETE</p><h2>本次成績</h2><p>共完成 ${state.session.total} 題，以下保留這次練習的錯題。</p></header>
    <section class="scoreboard" aria-label="本次成績"><div class="accuracy-score"><strong>${score.accuracy}%</strong><span>正確率</span></div><div class="score-count"><span>答對 <b>${score.correct}</b> 題</span><span>答錯 <b>${score.wrong}</b> 題</span></div></section>
    <section class="mistake-list"><div class="mistake-list-head"><h3>答錯的和弦</h3><span>${score.wrong} 題</span></div>${mistakes || '<p class="no-mistakes">全部答對，這輪沒有需要複習的和弦。</p>'}</section>
    <div class="summary-actions"><button class="secondary-button" type="button" data-action="settings">重新設定</button><button class="primary-button" type="button" data-action="restart">以相同設定再練一次 →</button></div>
  </section>`);
}

function renderPractice() {
  const forward = state.direction === 'forward';
  const questionNumber = Math.min(state.session.completed + (state.feedback ? 0 : 1), state.session.total);
  const timer = state.config.duration ? `<div class="timer" data-timer>--</div>` : `<div class="timer">不限時</div>`;
  const subject = forward ? `<p class="chord-symbol">${escapeHtml(state.question.symbol)}</p>` : `<div class="tone-set">${state.question.tones.map((tone) => `<span class="tone-chip">${escapeHtml(tone.name)}</span>`).join('')}</div>`;
  const input = forward ? renderForwardInput() : renderReverseInput();
  return renderShell(`<div class="practice-top"><button class="icon-button" type="button" data-action="settings">← 重新設定</button>${timer}</div>
    <section class="paper-panel question-card"><div class="question-strip"><span class="mode-badge">${forward ? '看和弦填組成音' : '看組成音猜和弦'}</span><span>第 ${questionNumber}／${state.session.total} 題</span></div><div class="question-body"><p class="prompt">${forward ? '這個和弦由哪些音組成？' : '這組音構成什麼和弦？'}</p>${subject}${state.feedback ? '' : input}${state.feedback ? renderFeedback() : `<div class="submit-row"><p class="submit-message" role="alert"></p><button class="primary-button" type="button" data-action="submit">送出答案</button></div>`}</div></section>${renderFretboard()}`);
}

function render(restoreFocus = false) {
  app.innerHTML = state.view === 'setup' ? renderSetup() : state.view === 'summary' ? renderSummary() : renderPractice();
  if (state.view === 'practice' && state.config.duration && !state.feedback) updateTimerDisplay();
  if (restoreFocus && !state.feedback) requestAnimationFrame(() => app.querySelector(`[data-note-cell][data-grid="${state.focusGrid}"][data-column="${state.focus.column}"]`)?.focus());
}

function clearTimer() {
  if (state.timerId) window.clearInterval(state.timerId);
  state.timerId = null;
  state.deadline = null;
}

function updateTimerDisplay() {
  if (!state.deadline || state.feedback) return;
  const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  const timer = app.querySelector('[data-timer]');
  if (timer) {
    timer.textContent = `${seconds.toString().padStart(2, '0')} 秒`;
    timer.classList.toggle('danger', seconds <= 5);
  }
  if (seconds <= 0) finishQuestion(true);
}

function startTimer() {
  clearTimer();
  if (!state.config.duration) return;
  state.deadline = Date.now() + state.config.duration * 1000;
  updateTimerDisplay();
  state.timerId = window.setInterval(updateTimerDisplay, 250);
}

function issueQuestion() {
  clearTimer();
  state.question = randomQuestion({
    templateIds: state.config.templateIds,
    rootNames: rootNamesForAccidentals(state.config.rootAccidentals),
  }, state.previousKey);
  state.previousKey = state.question.key;
  state.direction = state.config.mode === 'mixed' ? (Math.random() < 0.5 ? 'forward' : 'reverse') : state.config.mode;
  state.answerGrid = createAnswerGrid(state.question.tones.length);
  state.rootGrid = createAnswerGrid(1);
  state.reverseTemplateId = '';
  state.focus = { column: 0 };
  state.focusGrid = state.direction === 'forward' ? 'answer' : 'root';
  state.feedback = null;
  state.fretboardOpen = false;
  render(true);
  startTimer();
}

function finishQuestion(timedOut = false) {
  if (state.feedback) return;
  clearTimer();
  if (state.direction === 'forward') {
    const result = gradeNotes(state.question.tones, notesFromGrid(state.answerGrid));
    state.feedback = { ...result, result, timedOut };
  } else {
    const root = notesFromGrid(state.rootGrid)[0];
    state.feedback = { correct: root === state.question.root && state.reverseTemplateId === state.question.templateId, timedOut };
  }
  state.session = recordQuestionResult(state.session, state.question, state.feedback.correct);
  render();
}

function advanceFromFeedback(action = nextActionAfterFeedback(state.session)) {
  if (action === 'summary') {
    state.view = 'summary';
    render();
    return;
  }
  issueQuestion();
}

function selectedTemplateIds() {
  return [...app.querySelectorAll('.type-check:checked')].map((input) => input.value);
}

function selectedRootAccidentals() {
  return [...app.querySelectorAll('.root-accidental-check:checked')].map((input) => input.value);
}

function setInputKey(key, gridName = state.focusGrid, column = state.focus.column) {
  const grid = gridName === 'answer' ? state.answerGrid : state.rootGrid;
  const next = applyAnswerKey(grid, column, key);
  if (gridName === 'answer') state.answerGrid = next.grid; else state.rootGrid = next.grid;
  state.focusGrid = gridName;
  state.focus = { column: next.column };
  render(true);
}

app.addEventListener('change', (event) => {
  if (event.target.matches('input[name="mode"]')) state.config.mode = event.target.value;
  if (event.target.matches('#duration')) state.config.duration = Number(event.target.value);
  if (event.target.matches('#question-count')) state.config.questionCount = Number(event.target.value);
  if (event.target.matches('.root-accidental-check')) {
    state.config.rootAccidentals = selectedRootAccidentals();
    state.setupError = '';
    render();
  }
  if (event.target.matches('.type-check')) {
    state.config.templateIds = selectedTemplateIds();
    render();
  }
  if (event.target.matches('#reverse-template')) state.reverseTemplateId = event.target.value;
});

app.addEventListener('click', (event) => {
  const alterButton = event.target.closest('[data-alter-key]');
  if (alterButton && !state.feedback) {
    setInputKey(alterButton.dataset.alterKey, alterButton.dataset.grid, Number(alterButton.dataset.column));
    return;
  }
  const cell = event.target.closest('[data-note-cell]');
  if (cell && !state.feedback) {
    state.focusGrid = cell.dataset.grid;
    state.focus = { column: Number(cell.dataset.column) };
    render(true);
    return;
  }
  const inputKey = event.target.closest('[data-input-key]');
  if (inputKey && !state.feedback) {
    setInputKey(inputKey.dataset.inputKey);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'select-all') { state.config.templateIds = [...allTemplateIds]; render(); }
  if (action === 'select-basic') { state.config.templateIds = [...BASIC_TEMPLATE_IDS]; render(); }
  if (action === 'select-none') { state.config.templateIds = []; render(); }
  if (action === 'toggle-release-history') { state.releaseHistoryOpen = !state.releaseHistoryOpen; render(); }
  if (action === 'start') {
    state.config.templateIds = selectedTemplateIds();
    state.config.rootAccidentals = selectedRootAccidentals();
    if (!state.config.templateIds.length) { state.setupError = '請至少選擇一種和弦類型。'; render(); return; }
    if (!state.config.rootAccidentals.length) { state.setupError = '請至少選擇一種根音記號。'; render(); return; }
    state.setupError = '';
    state.releaseHistoryOpen = false;
    state.view = 'practice';
    state.session = createPracticeSession(state.config.questionCount);
    issueQuestion();
  }
  if (action === 'settings') { clearTimer(); state.releaseHistoryOpen = false; state.view = 'setup'; state.question = null; render(); }
  if (action === 'submit') finishQuestion(false);
  if (action === 'next' || action === 'summary') advanceFromFeedback();
  if (action === 'restart') { state.view = 'practice'; state.session = createPracticeSession(state.config.questionCount); state.previousKey = ''; issueQuestion(); }
  if (action === 'toggle-fretboard') { state.fretboardOpen = !state.fretboardOpen; render(); }
  if (action === 'toggle-setup-fretboard') { state.setupFretboardOpen = !state.setupFretboardOpen; render(); }
});

document.addEventListener('keydown', (event) => {
  const feedbackAction = feedbackKeyboardAction({
    key: event.key,
    view: state.view,
    hasFeedback: Boolean(state.feedback),
    session: state.session,
  });
  if (feedbackAction) {
    event.preventDefault();
    advanceFromFeedback(feedbackAction);
    return;
  }
  if (state.view !== 'practice') return;
  if (state.feedback) return;
  const cell = event.target.closest('[data-note-cell]');
  if (!cell) return;
  const gridName = cell.dataset.grid;
  const grid = gridName === 'answer' ? state.answerGrid : state.rootGrid;
  const focus = { column: Number(cell.dataset.column) };
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    state.focusGrid = gridName;
    state.focus = moveFocus(focus, event.key, grid.length);
    render(true);
    return;
  }
  if (event.key === 'Enter') { event.preventDefault(); finishQuestion(false); return; }
  if (/^[a-g]$/i.test(event.key) || ['+', '-', 'Delete', 'Backspace', 'n', 'N'].includes(event.key)) {
    event.preventDefault();
    setInputKey(event.key, gridName, focus.column);
  }
});

render();
