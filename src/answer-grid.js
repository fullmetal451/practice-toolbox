const INPUT_LETTERS = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

export function createAnswerGrid(count) {
  return Array.from({ length: count }, () => ({ letter: '', accidental: 0 }));
}

export function moveFocus(focus, key, count) {
  const column = Math.min(Math.max(focus.column, 0), Math.max(count - 1, 0));
  if (key === 'ArrowLeft') return { column: Math.max(column - 1, 0) };
  if (key === 'ArrowRight') return { column: Math.min(column + 1, Math.max(count - 1, 0)) };
  return { column };
}

export function applyAnswerKey(grid, column, key) {
  const next = grid.map((entry) => ({ ...entry }));
  const currentColumn = Math.min(Math.max(column, 0), Math.max(next.length - 1, 0));
  const entry = next[currentColumn];
  if (!entry) return { grid: next, column: currentColumn };
  const upper = key.toUpperCase();
  if (INPUT_LETTERS.has(upper)) {
    const targetColumn = entry.letter ? Math.min(currentColumn + 1, next.length - 1) : currentColumn;
    next[targetColumn].letter = upper;
    next[targetColumn].accidental = 0;
    return { grid: next, column: targetColumn };
  }
  if (entry.letter) {
    if (key === '+' || key === '#') entry.accidental = entry.accidental === 1 ? 0 : 1;
    if (key === '-' || key === 'b') entry.accidental = entry.accidental === -1 ? 0 : -1;
    if (key === 'Delete' || key === 'Backspace' || key.toLowerCase() === 'n') entry.accidental = 0;
  }
  return { grid: next, column: currentColumn };
}

export function notesFromGrid(grid) {
  return grid.map(({ letter, accidental }) => {
    if (!letter) return '';
    return `${letter}${accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(Math.abs(accidental))}`;
  });
}
