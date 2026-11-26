import assert from 'node:assert/strict';
import test from 'node:test';

import * as session from '../src/session.js';

test('chooses the next question or settlement after feedback', () => {
  const unfinished = session.createPracticeSession(2);
  const completed = { ...unfinished, completed: 2 };

  assert.equal(typeof session.nextActionAfterFeedback, 'function');
  assert.equal(session.nextActionAfterFeedback(unfinished), 'next');
  assert.equal(session.nextActionAfterFeedback(completed), 'summary');
});

test('reserves Enter feedback navigation for the practice correction state', () => {
  const unfinished = session.createPracticeSession(2);
  const completed = { ...unfinished, completed: 2 };

  assert.equal(typeof session.feedbackKeyboardAction, 'function');
  assert.equal(session.feedbackKeyboardAction({ key: 'Enter', view: 'practice', hasFeedback: true, session: unfinished }), 'next');
  assert.equal(session.feedbackKeyboardAction({ key: 'Enter', view: 'practice', hasFeedback: true, session: completed }), 'summary');
  assert.equal(session.feedbackKeyboardAction({ key: 'Enter', view: 'practice', hasFeedback: false, session: unfinished }), null);
  assert.equal(session.feedbackKeyboardAction({ key: 'Space', view: 'practice', hasFeedback: true, session: unfinished }), null);
  assert.equal(session.feedbackKeyboardAction({ key: 'Enter', view: 'setup', hasFeedback: true, session: unfinished }), null);
});
