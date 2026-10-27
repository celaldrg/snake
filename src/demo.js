/**
 * Fixed mid-game position used by the `?demo` URL (README screenshot only).
 * @module demo
 */
import { createGame } from './game.js';

/** Body of the demo snake, tail first, as [x, y] pairs on a 20x20 board. */
const DEMO_BODY_TAIL_FIRST = [
  [5, 15], [5, 14], [5, 13], [6, 13], [7, 13], [8, 13],
  [8, 12], [8, 11], [8, 10], [9, 10], [10, 10], [11, 10],
];

/**
 * Builds the deterministic demo game: a 12-cell snake heading right, food in view,
 * the score of the 9 foods it took to grow, already running.
 * @returns {ReturnType<typeof createGame>}
 */
export function createDemoGame() {
  const game = createGame({
    cols: 20,
    rows: 20,
    speed: 'normal',
    seed: 2026,
    snake: DEMO_BODY_TAIL_FIRST.map(([x, y]) => ({ x, y })).reverse(),
    direction: 'right',
    food: { x: 15, y: 7 },
    score: 90,
  });
  game.start();
  return game;
}
