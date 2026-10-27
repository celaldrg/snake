import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, spawnFood, MAX_QUEUED_TURNS } from '../src/game.js';
import { createRng, randomInt } from '../src/rng.js';
import { getSpeed } from '../src/speed.js';

/** Turns [x, y] pairs (head first) into cells. */
const cells = (...pairs) => pairs.map(([x, y]) => ({ x, y }));

/** Creates a game that is already running. */
function running(options) {
  const game = createGame({ seed: 1, ...options });
  game.start();
  return game;
}

const onSnake = (cell, snake) => snake.some((part) => part.x === cell.x && part.y === cell.y);

describe('self-collision', () => {
  test('running into its own body ends the game', () => {
    // Head at (2,2) moving right; turning up hits (2,1), a body cell that is not the tail.
    const game = running({
      cols: 8, rows: 8, direction: 'right', food: { x: 7, y: 7 },
      snake: cells([2, 2], [1, 2], [1, 1], [2, 1], [3, 1], [4, 1]),
    });
    assert.equal(game.turn('up'), true);
    assert.equal(game.step(), 'died');
    const state = game.getState();
    assert.equal(state.status, 'over');
    assert.equal(state.cause, 'self');
    assert.deepEqual(state.snake[0], { x: 2, y: 2 }, 'the head does not move into the body');
  });

  test('a tight loop during normal play ends the game', () => {
    const game = running({
      cols: 10, rows: 10, direction: 'right', food: { x: 0, y: 0 },
      snake: cells([5, 5], [4, 5], [3, 5], [2, 5], [1, 5]),
    });
    for (const direction of ['down', 'left']) {
      game.turn(direction);
      assert.equal(game.step(), 'moved');
    }
    game.turn('up');
    assert.equal(game.step(), 'died');
    assert.equal(game.getState().cause, 'self');
  });

  test('a finished game ignores further input and time', () => {
    const game = running({
      cols: 8, rows: 8, direction: 'right', food: { x: 7, y: 7 },
      snake: cells([2, 2], [1, 2], [1, 1], [2, 1], [3, 1], [4, 1]),
    });
    game.turn('up');
    game.step();
    const before = game.getState();
    assert.equal(game.turn('down'), false);
    assert.equal(game.step(), 'idle');
    assert.deepEqual(game.update(10_000), []);
    assert.equal(game.togglePause(), 'over');
    assert.deepEqual(game.getState(), before);
  });
});

describe('walls', () => {
  test('hitting a wall ends the game in walls mode', () => {
    const cases = [
      { direction: 'right', snake: cells([9, 4], [8, 4]) },
      { direction: 'left', snake: cells([0, 4], [1, 4]) },
      { direction: 'up', snake: cells([4, 0], [4, 1]) },
      { direction: 'down', snake: cells([4, 9], [4, 8]) },
    ];
    for (const { direction, snake } of cases) {
      const game = running({ cols: 10, rows: 10, direction, snake, food: { x: 5, y: 5 } });
      assert.equal(game.step(), 'died', direction);
      assert.equal(game.getState().status, 'over');
      assert.equal(game.getState().cause, 'wall');
    }
  });

  test('wrap mode wraps around every edge', () => {
    const cases = [
      { direction: 'right', snake: cells([9, 4], [8, 4]), head: { x: 0, y: 4 } },
      { direction: 'left', snake: cells([0, 4], [1, 4]), head: { x: 9, y: 4 } },
      { direction: 'up', snake: cells([4, 0], [4, 1]), head: { x: 4, y: 9 } },
      { direction: 'down', snake: cells([4, 9], [4, 8]), head: { x: 4, y: 0 } },
    ];
    for (const { direction, snake, head } of cases) {
      const game = running({ cols: 10, rows: 10, wrap: true, direction, snake, food: { x: 5, y: 5 } });
      assert.equal(game.step(), 'moved', direction);
      const state = game.getState();
      assert.equal(state.status, 'running');
      assert.deepEqual(state.snake[0], head);
      assert.equal(state.snake.length, 2);
    }
  });
});

describe('eating', () => {
  test('eating grows the snake by one, scores, and respawns food off the snake', () => {
    const game = running({
      cols: 10, rows: 10, direction: 'right', seed: 99,
      snake: cells([5, 5], [4, 5], [3, 5]), food: { x: 6, y: 5 },
    });
    assert.equal(game.step(), 'ate');
    const state = game.getState();
    assert.deepEqual(state.snake, cells([6, 5], [5, 5], [4, 5], [3, 5]));
    assert.equal(state.score, getSpeed('normal').points);
    assert.ok(state.food, 'new food exists');
    assert.ok(state.food.x >= 0 && state.food.x < 10 && state.food.y >= 0 && state.food.y < 10);
    assert.equal(onSnake(state.food, state.snake), false);
  });

  test('new food is off the snake for many seeds on a crowded board', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      // A 9-cell snake eats on a 6x2 board, leaving only the last column free.
      const game = running({
        cols: 6, rows: 2, direction: 'down', seed,
        snake: cells([0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 1], [2, 1], [1, 1]),
        food: { x: 0, y: 1 },
      });
      assert.equal(game.step(), 'ate');
      const { food, snake } = game.getState();
      assert.equal(onSnake(food, snake), false, `seed ${seed}`);
    }
  });

  test('spawnFood picks only free cells and returns null on a full board', () => {
    const rng = createRng(5);
    const snake = cells([0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]);
    for (let i = 0; i < 50; i += 1) {
      assert.deepEqual(spawnFood(3, 3, snake, rng), { x: 1, y: 1 });
    }
    assert.equal(spawnFood(3, 3, [...snake, { x: 1, y: 1 }], rng), null);
  });

  test('faster speed levels give a score bonus', () => {
    const scoreAt = (speed) => {
      const game = running({ speed, direction: 'right', snake: cells([5, 5], [4, 5]), food: { x: 6, y: 5 } });
      game.step();
      return game.getState().score;
    };
    assert.ok(scoreAt('fast') > scoreAt('normal'));
    assert.ok(scoreAt('insane') > scoreAt('fast'));
    assert.ok(scoreAt('slow') <= scoreAt('normal'));
  });

  test('filling the whole board wins the game', () => {
    const game = running({
      cols: 2, rows: 2, direction: 'right',
      snake: cells([1, 0], [0, 0], [0, 1]), food: { x: 1, y: 1 },
    });
    game.turn('down');
    assert.equal(game.step(), 'won');
    const state = game.getState();
    assert.equal(state.status, 'won');
    assert.equal(state.food, null);
    assert.equal(state.snake.length, 4);
  });
});

describe('direction input', () => {
  test('a reverse input is ignored', () => {
    const game = running({ direction: 'right', snake: cells([5, 5], [4, 5], [3, 5]), food: { x: 0, y: 0 } });
    assert.equal(game.turn('left'), false);
    assert.equal(game.turn('right'), false, 'repeating the current direction is ignored');
    assert.equal(game.step(), 'moved');
    assert.deepEqual(game.getState().snake[0], { x: 6, y: 5 });
    assert.equal(game.getState().direction, 'right');
  });

  test('a reverse of a buffered turn is ignored', () => {
    const game = running({ direction: 'right', snake: cells([5, 5], [4, 5], [3, 5]), food: { x: 0, y: 0 } });
    assert.equal(game.turn('up'), true);
    assert.equal(game.turn('down'), false);
  });

  test(`up to ${MAX_QUEUED_TURNS} turns are buffered and applied on consecutive ticks`, () => {
    const game = running({ direction: 'right', snake: cells([5, 5], [4, 5], [3, 5]), food: { x: 0, y: 0 } });
    assert.equal(game.turn('up'), true);
    assert.equal(game.turn('left'), true);
    assert.equal(game.turn('down'), false, 'the queue is full');
    game.step();
    assert.deepEqual(game.getState().snake[0], { x: 5, y: 4 });
    assert.equal(game.getState().direction, 'up');
    game.step();
    assert.deepEqual(game.getState().snake[0], { x: 4, y: 4 });
    assert.equal(game.getState().direction, 'left');
    assert.equal(game.getState().status, 'running');
  });

  test('turns queued before start are applied on the first tick', () => {
    const game = createGame({ seed: 1, direction: 'right', snake: cells([5, 5], [4, 5]), food: { x: 0, y: 0 } });
    assert.equal(game.turn('down'), true);
    assert.equal(game.step(), 'idle', 'nothing moves before start');
    game.start();
    game.step();
    assert.deepEqual(game.getState().snake[0], { x: 5, y: 6 });
  });

  test('unknown directions are rejected', () => {
    const game = running({});
    assert.equal(game.turn('north'), false);
    assert.equal(game.turn('toString'), false);
  });
});

describe('tail following', () => {
  test('moving into the cell the tail just left is allowed', () => {
    // A 4-cell snake circling a 2x2 block always moves into its own tail cell.
    const game = running({
      cols: 4, rows: 4, direction: 'right', food: { x: 3, y: 3 },
      snake: cells([1, 0], [0, 0], [0, 1], [1, 1]),
    });
    const loop = ['down', 'left', 'up', 'right'];
    for (let i = 0; i < 12; i += 1) {
      assert.equal(game.turn(loop[i % 4]), true);
      assert.equal(game.step(), 'moved', `step ${i}`);
    }
    const state = game.getState();
    assert.equal(state.status, 'running');
    assert.equal(state.snake.length, 4);
  });
});

describe('timing and status', () => {
  test('update runs one step per tick and caps catch-up after a stall', () => {
    const { tickMs } = getSpeed('normal');
    const game = running({ direction: 'right', snake: cells([5, 5], [4, 5]), food: { x: 0, y: 0 } });
    assert.deepEqual(game.update(tickMs - 1), []);
    assert.deepEqual(game.update(1), ['moved']);
    assert.deepEqual(game.update(tickMs * 2), ['moved', 'moved']);
    assert.equal(game.update(60_000).length, 3);
    assert.deepEqual(game.getState().snake[0], { x: 11, y: 5 });
  });

  test('progress reports how far the current tick has elapsed', () => {
    const { tickMs } = getSpeed('slow');
    const game = running({ speed: 'slow', direction: 'right', snake: cells([5, 5]), food: { x: 0, y: 0 } });
    game.update(tickMs / 2);
    assert.equal(game.getState().progress, 0.5);
  });

  test('a new game waits for start, and pause stops time', () => {
    const game = createGame({ seed: 3 });
    assert.equal(game.getState().status, 'ready');
    assert.deepEqual(game.update(1000), []);
    assert.equal(game.pause(), 'ready');
    assert.equal(game.start(), true);
    assert.equal(game.start(), false);
    assert.equal(game.togglePause(), 'paused');
    assert.deepEqual(game.update(1000), []);
    assert.equal(game.togglePause(), 'running');
    assert.equal(game.pause(), 'paused');
    assert.equal(game.turn('up'), false, 'no input while paused');
  });

  test('the default game is a centred 3-cell snake on a 20x20 board with food', () => {
    const state = createGame({ seed: 8 }).getState();
    assert.equal(state.cols, 20);
    assert.equal(state.rows, 20);
    assert.equal(state.wrap, false);
    assert.equal(state.speed, 'normal');
    assert.deepEqual(state.snake, cells([10, 10], [9, 10], [8, 10]));
    assert.equal(state.direction, 'right');
    assert.equal(state.score, 0);
    assert.equal(onSnake(state.food, state.snake), false);
  });

  test('getState returns a copy', () => {
    const game = createGame({ seed: 4 });
    const state = game.getState();
    state.snake[0].x = -1;
    state.food.x = -1;
    assert.notEqual(game.getState().snake[0].x, -1);
    assert.notEqual(game.getState().food.x, -1);
  });

  test('invalid options are rejected', () => {
    assert.throws(() => createGame({ speed: 'warp' }), RangeError);
    assert.throws(() => createGame({ cols: 1 }), RangeError);
    assert.throws(() => createGame({ rows: 2.5 }), RangeError);
    assert.throws(() => createGame({ direction: 'north' }), RangeError);
    assert.throws(() => createGame({ cols: 5, rows: 5, snake: cells([5, 0]) }), RangeError);
    assert.throws(() => createGame({ snake: cells([1, 1], [1, 1]) }), RangeError);
    assert.throws(() => createGame({ snake: cells([1, 1]), food: { x: 1, y: 1 } }), RangeError);
  });
});

describe('determinism and invariants', () => {
  test('the same seed and inputs give the same game', () => {
    const play = (seed) => {
      const game = running({ seed, wrap: true });
      const foods = [];
      for (let i = 0; i < 300; i += 1) {
        const { snake, food } = game.getState();
        // Steer greedily towards the food so the game eats often.
        const dx = food.x - snake[0].x;
        const dy = food.y - snake[0].y;
        game.turn(dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
        if (game.step() === 'ate') foods.push(game.getState().food);
        if (game.getState().status !== 'running') break;
      }
      return foods;
    };
    const first = play(42);
    assert.ok(first.length > 3, 'the greedy player eats several times');
    assert.deepEqual(play(42), first);
    assert.notDeepEqual(play(43), first);
  });

  test('random play keeps the snake in bounds, unbroken and off the food', () => {
    const directions = ['up', 'down', 'left', 'right'];
    for (let seed = 1; seed <= 60; seed += 1) {
      const wrap = seed % 2 === 0;
      const cols = 8;
      const rows = 8;
      const game = running({ cols, rows, wrap, seed });
      const input = createRng(seed * 7919);
      for (let tick = 0; tick < 400 && game.getState().status === 'running'; tick += 1) {
        if (input() < 0.4) game.turn(directions[randomInt(input, 4)]);
        game.step();
        const { snake, food } = game.getState();
        const keys = new Set(snake.map((c) => `${c.x},${c.y}`));
        assert.equal(keys.size, snake.length, 'no overlapping segments');
        for (const c of snake) assert.ok(c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows);
        for (let i = 1; i < snake.length; i += 1) {
          const dx = Math.abs(snake[i].x - snake[i - 1].x);
          const dy = Math.abs(snake[i].y - snake[i - 1].y);
          const gap = Math.min(dx, cols - dx) + Math.min(dy, rows - dy);
          assert.equal(wrap ? gap : dx + dy, 1, 'segments are adjacent');
        }
        if (food) assert.equal(onSnake(food, snake), false);
      }
    }
  });
});
