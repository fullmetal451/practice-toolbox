import assert from 'node:assert/strict';
import test from 'node:test';

import { buildChord } from '../src/music.js';
import { createPracticeSession, isSessionComplete, recordQuestionResult, sessionScore } from '../src/session.js';

test('counts completed questions and retains only wrong chords for the settlement', () => {
  let session = createPracticeSession(2);
  const correctQuestion = buildChord('C', 'maj');
  const wrongQuestion = buildChord('D', 'min7');

  session = recordQuestionResult(session, correctQuestion, true);
  assert.equal(session.completed, 1);
  assert.equal(isSessionComplete(session), false);
  assert.deepEqual(session.mistakes, []);

  session = recordQuestionResult(session, wrongQuestion, false);
  assert.equal(session.completed, 2);
  assert.equal(isSessionComplete(session), true);
  assert.deepEqual(sessionScore(session), { correct: 1, wrong: 1, accuracy: 50 });
  assert.deepEqual(session.mistakes, [{
    symbol: 'Dm7',
    label: '小七和弦',
    formula: ['1', 'b3', '5', 'b7'],
    tones: ['D', 'F', 'A', 'C'],
  }]);
});
