/**
 * Small seeded pseudo-random number generator (mulberry32) so games and tests are reproducible.
 * @module rng
 */

/**
 * Creates a deterministic random number generator.
 * @param {number} seed - Any number; only its lower 32 bits are used.
 * @returns {() => number} A function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks an integer in [0, n) using the given generator.
 * @param {() => number} rng - Generator returning floats in [0, 1).
 * @param {number} n - Exclusive upper bound (positive integer).
 * @returns {number}
 */
export function randomInt(rng, n) {
  return Math.floor(rng() * n);
}
