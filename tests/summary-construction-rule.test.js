import assert from 'node:assert/strict';
import test from 'node:test';

function actionTarget(action) {
  return { closest: (selector) => (selector === '[data-action]' ? { dataset: { action } } : null) };
}

async function loadPracticePage() {
  const listeners = new Map();
  const app = {
    innerHTML: '',
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === '.type-check:checked') return [{ value: 'maj7' }];
      if (selector === '.root-accidental-check:checked') return [{ value: 'natural' }];
      return [];
    },
  };
  const originalDocument = globalThis.document;
  const originalAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.document = {
    querySelector(selector) { return selector === '[data-app-root]' ? app : null; },
    addEventListener() {},
  };
  globalThis.requestAnimationFrame = (callback) => callback();

  const appUrl = new URL('../src/app.js', import.meta.url);
  appUrl.searchParams.set('summary-construction-rule-test', Date.now().toString());
  await import(appUrl.href);
  return {
    app,
    change: listeners.get('change'),
    click: listeners.get('click'),
    restore: () => {
      globalThis.document = originalDocument;
      globalThis.requestAnimationFrame = originalAnimationFrame;
    },
  };
}

test('結算錯題卡保留相鄰音程的組成規律', async () => {
  const page = await loadPracticePage();
  try {
    page.change({ target: { value: '1', matches: (selector) => selector === '#question-count' } });
    page.click({ target: actionTarget('start') });
    page.click({ target: actionTarget('submit') });
    page.click({ target: actionTarget('summary') });

    assert.match(page.app.innerHTML, /class="mistake-card"/);
    assert.match(page.app.innerHTML, /class="construction-rule"/);
    assert.match(page.app.innerHTML, /由左到右，從前一音往上堆疊。/);
    assert.match(page.app.innerHTML, /公式讀法：/);
  } finally {
    page.restore();
  }
});
