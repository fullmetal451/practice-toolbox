export function createPracticeSession(total) {
  const count = Number(total);
  if (!Number.isInteger(count) || count < 1) throw new Error('答題數必須至少為 1');
  return { total: count, completed: 0, mistakes: [] };
}

export function recordQuestionResult(session, question, correct) {
  const mistake = correct ? [] : [{
    symbol: question.symbol,
    label: question.template.label,
    formula: [...question.template.degrees],
    tones: question.tones.map((tone) => tone.name),
  }];
  return {
    ...session,
    completed: session.completed + 1,
    mistakes: [...session.mistakes, ...mistake],
  };
}

export function isSessionComplete(session) {
  return session.completed >= session.total;
}

export function nextActionAfterFeedback(session) {
  return isSessionComplete(session) ? 'summary' : 'next';
}

export function feedbackKeyboardAction({ key, view, hasFeedback, session }) {
  if (key !== 'Enter' || view !== 'practice' || !hasFeedback) return null;
  return nextActionAfterFeedback(session);
}

export function sessionScore(session) {
  const wrong = session.mistakes.length;
  const correct = session.completed - wrong;
  return {
    correct,
    wrong,
    accuracy: session.completed ? Math.round((correct / session.completed) * 100) : 0,
  };
}
