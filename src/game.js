/**
 * Snake rules as a DOM-free model. A UI drives it with `turn`, `start`, `togglePause`
 * and `update(dtMs)`, and draws whatever `getState()` returns.
 * @module game
 */
import { createRng, randomInt } from './rng.js';
import { DEFAULT_SPEED, getSpeed } from './speed.js';

/** @typedef {{ x: number, y: number }} Cell */
/** @typedef {'up' | 'down' | 'left' | 'right'} Direction */
/** @typedef {'ready' | 'running' | 'paused' | 'over' | 'won'} Status */
/** @typedef {'moved' | 'ate' | 'died' | 'won' | 'idle'} StepEvent */

/**
 * @typedef {object} GameState
 * @property {number} cols
 * @property {number} rows
 * @property {boolean} wrap - True when the edges wrap around instead of killing.
 * @property {string} speed - Speed level id.
 * @property {number} tickMs - Milliseconds per move at this speed.
 * @property {Cell[]} snake - Body cells, head first.
 * @property {Direction} direction - Direction of the last move (where the head faces).
 * @property {Cell | null} food - Null only when the board is full.
 * @property {number} score
 * @property {Status} status
 * @property {'wall' | 'self' | null} cause - What ended the game, if it is over.
 * @property {number} progress - Fraction [0, 1) of the current tick already elapsed.
 */

/**
 * @typedef {object} GameOptions
 * @property {number} [cols=20] - Board width in cells (2-100).
 * @property {number} [rows=20] - Board height in cells (2-100).
 * @property {boolean} [wrap=false] - Wrap around the edges instead of dying on walls.
 * @property {string} [speed='normal'] - Speed level id.
 * @property {number} [seed] - RNG seed for food placement (defaults to the current time).
 * @property {Cell[]} [snake] - Starting body, head first (defaults to 3 centred cells).
 * @property {Direction} [direction='right'] - Starting heading.
 * @property {Cell} [food] - Starting food cell (defaults to a random free cell).
 * @property {number} [score=0] - Starting score.
 */

/** Unit vector of each direction. */
export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

/** Turns that can be buffered ahead of the next tick. */
export const MAX_QUEUED_TURNS = 2;

const OPPOSITE = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });
const MAX_CATCH_UP_TICKS = 3;
const MIN_SIZE = 2;
const MAX_SIZE = 100;
const DEFAULT_LENGTH = 3;

const sameCell = (a, b) => a.x === b.x && a.y === b.y;
const isDirection = (value) => typeof value === 'string' && Object.hasOwn(DIRECTIONS, value);

/**
 * Picks a uniformly random cell that is not covered by the snake.
 * @param {number} cols
 * @param {number} rows
 * @param {Cell[]} snake
 * @param {() => number} rng - Generator returning floats in [0, 1).
 * @returns {Cell | null} The food cell, or null when the board is full.
 */
export function spawnFood(cols, rows, snake, rng) {
  const taken = new Set(snake.map((cell) => cell.y * cols + cell.x));
  const free = [];
  for (let index = 0; index < cols * rows; index += 1) {
    if (!taken.has(index)) free.push(index);
  }
  if (free.length === 0) return null;
  const pick = free[randomInt(rng, free.length)];
  return { x: pick % cols, y: Math.floor(pick / cols) };
}

function assertSize(value, name) {
  if (!Number.isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    throw new RangeError(`${name} must be an integer from ${MIN_SIZE} to ${MAX_SIZE}`);
  }
}

function inBounds(cell, cols, rows) {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y)
    && cell.x >= 0 && cell.x < cols && cell.y >= 0 && cell.y < rows;
}

function defaultSnake(cols, rows) {
  const head = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const length = Math.min(DEFAULT_LENGTH, head.x + 1);
  return Array.from({ length }, (_, i) => ({ x: head.x - i, y: head.y }));
}

function buildSnake(cells, cols, rows) {
  const snake = cells.map(({ x, y }) => ({ x, y }));
  const unique = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const valid = snake.length > 0 && unique.size === snake.length
    && snake.every((cell) => inBounds(cell, cols, rows));
  if (!valid) throw new RangeError('snake must be non-empty, in bounds and must not overlap itself');
  return snake;
}

function buildFood(cell, snake, cols, rows) {
  const food = { x: cell.x, y: cell.y };
  if (!inBounds(food, cols, rows) || snake.some((part) => sameCell(part, food))) {
    throw new RangeError('food must be in bounds and off the snake');
  }
  return food;
}

/** Moves one cell; returns null when that leaves the board in walls mode. */
function advance(from, direction, cols, rows, wrap) {
  const delta = DIRECTIONS[direction];
  const next = { x: from.x + delta.x, y: from.y + delta.y };
  if (wrap) return { x: (next.x + cols) % cols, y: (next.y + rows) % rows };
  return inBounds(next, cols, rows) ? next : null;
}

/**
 * Creates a game. It starts in the 'ready' status; call `start()` to let ticks run.
 * @param {GameOptions} [options]
 */
export function createGame(options = {}) {
  const {
    cols = 20,
    rows = 20,
    wrap = false,
    speed = DEFAULT_SPEED,
    seed = Date.now(),
    direction = 'right',
    score = 0,
  } = options;
  assertSize(cols, 'cols');
  assertSize(rows, 'rows');
  if (!isDirection(direction)) throw new RangeError(`Unknown direction: ${direction}`);
  const level = getSpeed(speed);
  const rng = createRng(seed);
  const snake = options.snake ? buildSnake(options.snake, cols, rows) : defaultSnake(cols, rows);
  const food = options.food
    ? buildFood(options.food, snake, cols, rows)
    : spawnFood(cols, rows, snake, rng);

  const state = {
    snake,
    food,
    direction,
    score,
    status: /** @type {Status} */ (food === null ? 'won' : 'ready'),
    cause: /** @type {'wall' | 'self' | null} */ (null),
  };
  /** @type {Direction[]} */
  let queue = [];
  let elapsed = 0;

  function endGame(cause) {
    state.status = 'over';
    state.cause = cause;
    queue = [];
    return 'died';
  }

  /**
   * Buffers a turn for an upcoming tick. Reversals, repeats and turns beyond
   * MAX_QUEUED_TURNS are ignored.
   * @param {Direction} next
   * @returns {boolean} Whether the turn was accepted.
   */
  function turn(next) {
    if (!isDirection(next) || (state.status !== 'ready' && state.status !== 'running')) return false;
    const last = queue.length > 0 ? queue[queue.length - 1] : state.direction;
    if (queue.length >= MAX_QUEUED_TURNS || next === last || OPPOSITE[last] === next) return false;
    queue.push(next);
    return true;
  }

  /**
   * Advances the snake by exactly one cell, ignoring timing.
   * @returns {StepEvent}
   */
  function step() {
    if (state.status !== 'running') return 'idle';
    if (queue.length > 0) state.direction = queue.shift();
    const head = advance(state.snake[0], state.direction, cols, rows, wrap);
    if (head === null) return endGame('wall');
    const eating = state.food !== null && sameCell(head, state.food);
    // The tail moves away this tick unless the snake grows, so its cell may be entered.
    const blocking = eating ? state.snake : state.snake.slice(0, -1);
    if (blocking.some((cell) => sameCell(cell, head))) return endGame('self');
    state.snake.unshift(head);
    if (!eating) {
      state.snake.pop();
      return 'moved';
    }
    state.score += level.points;
    state.food = spawnFood(cols, rows, state.snake, rng);
    if (state.food !== null) return 'ate';
    state.status = 'won';
    return 'won';
  }

  /**
   * Advances game time and runs one step per elapsed tick (at most a few per call,
   * so a stalled frame never causes a burst of moves).
   * @param {number} dtMs - Milliseconds since the previous call.
   * @returns {StepEvent[]} Events of the steps that ran, oldest first.
   */
  function update(dtMs) {
    if (state.status !== 'running') return [];
    elapsed = Math.min(elapsed + Math.max(0, dtMs), level.tickMs * MAX_CATCH_UP_TICKS);
    const events = [];
    while (elapsed >= level.tickMs && state.status === 'running') {
      elapsed -= level.tickMs;
      events.push(step());
    }
    return events;
  }

  /**
   * Leaves the 'ready' status so ticks start running.
   * @returns {boolean} Whether the game was started.
   */
  function start() {
    if (state.status !== 'ready') return false;
    state.status = 'running';
    elapsed = 0;
    return true;
  }

  /**
   * Switches between 'running' and 'paused'; other statuses are unchanged.
   * @returns {Status} The status after the call.
   */
  function togglePause() {
    if (state.status === 'running') state.status = 'paused';
    else if (state.status === 'paused') state.status = 'running';
    return state.status;
  }

  /**
   * Pauses a running game (e.g. when the page is hidden); no-op otherwise.
   * @returns {Status} The status after the call.
   */
  function pause() {
    if (state.status === 'running') state.status = 'paused';
    return state.status;
  }

  /**
   * Returns a snapshot that callers may freely mutate.
   * @returns {GameState}
   */
  function getState() {
    return {
      cols,
      rows,
      wrap,
      speed: level.id,
      tickMs: level.tickMs,
      snake: state.snake.map((cell) => ({ ...cell })),
      direction: state.direction,
      food: state.food && { ...state.food },
      score: state.score,
      status: state.status,
      cause: state.cause,
      progress: state.status === 'running' ? elapsed / level.tickMs : 0,
    };
  }

  return { turn, step, update, start, togglePause, pause, getState };
}
