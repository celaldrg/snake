import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomInt } from '../src/rng.js';

const sample = (rng, n) => Array.from({ length: n }, () => rng());

test('the same seed gives the same sequence', () => {
  assert.deepEqual(sample(createRng(123), 20), sample(createRng(123), 20));
  assert.notDeepEqual(sample(createRng(123), 20), sample(createRng(124), 20));
});

test('values stay in [0, 1) and randomInt stays in range', () => {
  const rng = createRng(7);
  const seen = new Set();
  for (let i = 0; i < 5000; i += 1) {
    const value = rng();
    assert.ok(value >= 0 && value < 1);
    const n = randomInt(rng, 6);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 6);
    seen.add(n);
  }
  assert.equal(seen.size, 6, 'every value is reachable');
});
