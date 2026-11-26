import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyAnswerKey,
  createAnswerGrid,
  moveFocus,
  notesFromGrid,
} from '../src/answer-grid.js';

test('moves the one-cell cursor left and right while clamping at the edges', () => {
  assert.deepEqual(moveFocus({ column: 0 }, 'ArrowLeft', 3), { column: 0 });
  assert.deepEqual(moveFocus({ column: 0 }, 'ArrowRight', 3), { column: 1 });
  assert.deepEqual(moveFocus({ column: 2 }, 'ArrowRight', 3), { column: 2 });
});

test('uppercases note letters and advances when a new note begins without an accidental', () => {
  let grid = createAnswerGrid(2);
  let input = applyAnswerKey(grid, 0, 'c');
  assert.equal(input.column, 0);
  input = applyAnswerKey(input.grid, input.column, 'd');
  grid = input.grid;
  assert.equal(input.column, 1);
  assert.deepEqual(notesFromGrid(grid), ['C', 'D']);
});

test('uses plus and minus for a single accidental and toggles the current accidental off', () => {
  let input = applyAnswerKey(createAnswerGrid(1), 0, 'e');
  input = applyAnswerKey(input.grid, input.column, '+');
  assert.deepEqual(input.grid[0], { letter: 'E', accidental: 1 });
  input = applyAnswerKey(input.grid, input.column, '-');
  assert.deepEqual(input.grid[0], { letter: 'E', accidental: -1 });
  input = applyAnswerKey(input.grid, input.column, '-');
  assert.deepEqual(input.grid[0], { letter: 'E', accidental: 0 });
});
