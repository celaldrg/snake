/**
 * Maps raw keyboard and swipe input to game actions. Pure: no DOM access.
 * @module input
 */

/** Minimum swipe distance in CSS pixels before it counts as a turn. */
export const SWIPE_THRESHOLD = 24;

const KEY_DIRECTIONS = Object.freeze({
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
});

const PAUSE_KEYS = Object.freeze([' ', 'spacebar', 'p']);

function lookupDirection(name) {
  const key = String(name).toLowerCase();
  return Object.hasOwn(KEY_DIRECTIONS, key) ? KEY_DIRECTIONS[key] : null;
}

/**
 * Direction for a key press: arrows or WASD. `code` (e.g. "KeyW") is the fallback so
 * WASD also works on non-Latin keyboard layouts.
 * @param {string} key - KeyboardEvent.key
 * @param {string} [code] - KeyboardEvent.code
 * @returns {import('./game.js').Direction | null}
 */
export function directionForKey(key, code = '') {
  return lookupDirection(key) ?? lookupDirection(code.replace(/^Key/, ''));
}

/**
 * Whether a key toggles pause (Space or P).
 * @param {string} key - KeyboardEvent.key
 * @returns {boolean}
 */
export function isPauseKey(key) {
  return PAUSE_KEYS.includes(String(key).toLowerCase());
}

/**
 * Direction of a swipe along its dominant axis, or null while it is still too short.
 * @param {number} dx - Horizontal distance in CSS pixels (positive = right).
 * @param {number} dy - Vertical distance in CSS pixels (positive = down).
 * @param {number} [threshold]
 * @returns {import('./game.js').Direction | null}
 */
export function swipeDirection(dx, dy, threshold = SWIPE_THRESHOLD) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
