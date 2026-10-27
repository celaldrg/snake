/**
 * Speed levels: tick length and points per food (faster levels pay a bonus).
 * @module speed
 */

/** @typedef {'slow' | 'normal' | 'fast' | 'insane'} SpeedLevel */
/** @typedef {{ id: SpeedLevel, tickMs: number, points: number }} Speed */

const SPEEDS = Object.freeze({
  slow: Object.freeze({ id: 'slow', tickMs: 200, points: 10 }),
  normal: Object.freeze({ id: 'normal', tickMs: 135, points: 10 }),
  fast: Object.freeze({ id: 'fast', tickMs: 90, points: 15 }),
  insane: Object.freeze({ id: 'insane', tickMs: 55, points: 25 }),
});

/** All speed levels, slowest first. */
export const SPEED_LEVELS = Object.freeze(/** @type {SpeedLevel[]} */ (Object.keys(SPEEDS)));

/** Level used when none is chosen. */
export const DEFAULT_SPEED = 'normal';

/**
 * Looks up a speed level.
 * @param {string} level - One of SPEED_LEVELS.
 * @returns {Speed}
 * @throws {RangeError} For an unknown level.
 */
export function getSpeed(level) {
  if (!Object.hasOwn(SPEEDS, level)) {
    throw new RangeError(`Unknown speed level: ${level}`);
  }
  return SPEEDS[level];
}
