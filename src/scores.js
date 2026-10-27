/**
 * Best score per speed level, persisted through the storage helper.
 * @module scores
 */
import { SPEED_LEVELS, getSpeed } from './speed.js';

/** Storage key of the best-scores record. */
export const BEST_SCORES_KEY = 'snake.bestScores.v1';

/**
 * Reads the best scores, treating missing or corrupt data as 0.
 * @param {import('./storage.js').SafeStorage} store
 * @returns {Record<string, number>} One non-negative integer per speed level.
 */
export function loadBestScores(store) {
  const saved = store.get(BEST_SCORES_KEY, {});
  const record = saved !== null && typeof saved === 'object' ? saved : {};
  const best = {};
  for (const level of SPEED_LEVELS) {
    const value = record[level];
    best[level] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  return best;
}

/**
 * Records a finished game's score and saves it when it beats the level's best.
 * @param {import('./storage.js').SafeStorage} store
 * @param {string} level - Speed level id.
 * @param {number} score
 * @returns {{ best: number, isNewBest: boolean }}
 */
export function submitScore(store, level, score) {
  getSpeed(level);
  const best = loadBestScores(store);
  if (score <= best[level]) return { best: best[level], isNewBest: false };
  best[level] = score;
  store.set(BEST_SCORES_KEY, best);
  return { best: score, isNewBest: true };
}
