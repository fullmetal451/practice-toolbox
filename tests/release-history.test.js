import assert from 'node:assert/strict';
import test from 'node:test';

async function loadSetupPage() {
  const listeners = new Map();
  const app = {
    innerHTML: '',
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) { return selector === '[data-app-root]' ? app : null; },
    addEventListener() {},
  };

  const appUrl = new URL('../src/app.js', import.meta.url);
  appUrl.searchParams.set('release-history-test', Date.now().toString());
  await import(appUrl.href);
  return { app, click: listeners.get('click'), restore: () => { globalThis.document = originalDocument; } };
}

function actionTarget(action) {
  return { closest: (selector) => (selector === '[data-action]' ? { dataset: { action } } : null) };
}

test('首頁版本歷程初始收合，點擊後展開並可再次收合', async () => {
  const page = await loadSetupPage();
  try {
    assert.match(page.app.innerHTML, /目前版本\s*<b>v1\.3\.1<\/b>/);
    assert.match(page.app.innerHTML, /data-action="toggle-release-history"[^>]*aria-expanded="false"/);
    assert.doesNotMatch(page.app.innerHTML, /class="release-history"/);

    page.click({ target: actionTarget('toggle-release-history') });
    assert.match(page.app.innerHTML, /data-action="toggle-release-history"[^>]*aria-expanded="true"/);
    assert.match(page.app.innerHTML, /class="release-history"/);
    assert.match(page.app.innerHTML, /結算錯題也能複習/);
    assert.match(page.app.innerHTML, /v1\.3\.0/);
    assert.match(page.app.innerHTML, /v1\.0\.0/);

    page.click({ target: actionTarget('toggle-release-history') });
    assert.match(page.app.innerHTML, /data-action="toggle-release-history"[^>]*aria-expanded="false"/);
    assert.doesNotMatch(page.app.innerHTML, /class="release-history"/);
  } finally {
    page.restore();
  }
});
