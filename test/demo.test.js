import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoGame } from '../src/demo.js';
import { DIRECTIONS } from '../src/game.js';

test('the demo is a running mid-game state with a 12-cell snake, food and a score', () => {
  const state = createDemoGame().getState();
  assert.equal(state.status, 'running');
  assert.equal(state.snake.length, 12);
  assert.ok(state.score > 0);
  assert.ok(state.food);
  assert.equal(state.snake.some((c) => c.x === state.food.x && c.y === state.food.y), false);
});

test('the demo snake is unbroken and its head faces the way it moves', () => {
  const { snake, direction } = createDemoGame().getState();
  for (let i = 1; i < snake.length; i += 1) {
    const distance = Math.abs(snake[i].x - snake[i - 1].x) + Math.abs(snake[i].y - snake[i - 1].y);
    assert.equal(distance, 1);
  }
  const delta = DIRECTIONS[direction];
  assert.deepEqual({ x: snake[0].x - snake[1].x, y: snake[0].y - snake[1].y }, delta);
});

test('the demo is deterministic and survives its next ticks', () => {
  assert.deepEqual(createDemoGame().getState(), createDemoGame().getState());
  const game = createDemoGame();
  for (let i = 0; i < 5; i += 1) assert.equal(game.step(), 'moved');
});
