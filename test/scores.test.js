import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEST_SCORES_KEY, loadBestScores, submitScore } from '../src/scores.js';
import { createStorage } from '../src/storage.js';
import { SPEED_LEVELS } from '../src/speed.js';

function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return createStorage(() => ({
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
  }));
}

test('best scores start at zero for every speed level', () => {
  const best = loadBestScores(memoryStore());
  assert.deepEqual(Object.keys(best), [...SPEED_LEVELS]);
  assert.ok(Object.values(best).every((value) => value === 0));
});

test('a higher score is saved per speed level; a lower one is not', () => {
  const store = memoryStore();
  assert.deepEqual(submitScore(store, 'fast', 120), { best: 120, isNewBest: true });
  assert.deepEqual(submitScore(store, 'fast', 80), { best: 120, isNewBest: false });
  assert.deepEqual(submitScore(store, 'fast', 120), { best: 120, isNewBest: false });
  assert.deepEqual(submitScore(store, 'slow', 30), { best: 30, isNewBest: true });
  assert.deepEqual(submitScore(store, 'normal', 0), { best: 0, isNewBest: false });
  const best = loadBestScores(store);
  assert.equal(best.fast, 120);
  assert.equal(best.slow, 30);
  assert.equal(best.insane, 0);
});

test('corrupt saved data is read as zero', () => {
  const store = memoryStore({ [BEST_SCORES_KEY]: JSON.stringify({ slow: 'lots', fast: -5, insane: 77.9 }) });
  assert.deepEqual(loadBestScores(store), { slow: 0, normal: 0, fast: 0, insane: 77 });
  assert.equal(loadBestScores(memoryStore({ [BEST_SCORES_KEY]: 'null' })).slow, 0);
});

test('scores still work when storage is unavailable', () => {
  const store = createStorage(() => { throw new Error('private mode'); });
  assert.deepEqual(submitScore(store, 'normal', 50), { best: 50, isNewBest: true });
  assert.equal(loadBestScores(store).normal, 0);
});

test('an unknown speed level is rejected', () => {
  assert.throws(() => submitScore(memoryStore(), 'warp', 10), RangeError);
});
