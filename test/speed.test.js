import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SPEED, SPEED_LEVELS, getSpeed } from '../src/speed.js';

test('speed levels go from slow to insane with shorter ticks', () => {
  assert.deepEqual([...SPEED_LEVELS], ['slow', 'normal', 'fast', 'insane']);
  assert.ok(SPEED_LEVELS.includes(DEFAULT_SPEED));
  const ticks = SPEED_LEVELS.map((level) => getSpeed(level).tickMs);
  for (let i = 1; i < ticks.length; i += 1) assert.ok(ticks[i] < ticks[i - 1]);
});

test('points never drop as the speed rises', () => {
  const points = SPEED_LEVELS.map((level) => getSpeed(level).points);
  for (let i = 1; i < points.length; i += 1) assert.ok(points[i] >= points[i - 1]);
  assert.ok(points.at(-1) > points[0]);
});

test('unknown levels are rejected', () => {
  assert.throws(() => getSpeed('warp'), RangeError);
  assert.throws(() => getSpeed('toString'), RangeError);
});
