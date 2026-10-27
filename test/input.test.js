import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWIPE_THRESHOLD, directionForKey, isPauseKey, swipeDirection } from '../src/input.js';

test('arrow keys and WASD steer, in either case', () => {
  const expected = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };
  for (const [key, direction] of Object.entries(expected)) {
    assert.equal(directionForKey(key), direction, key);
  }
});

test('WASD works on non-Latin layouts through the physical key code', () => {
  assert.equal(directionForKey('ц', 'KeyW'), 'up');
  assert.equal(directionForKey('ф', 'KeyA'), 'left');
});

test('other keys do not steer', () => {
  for (const key of ['Enter', ' ', 'x', 'Escape', 'Tab', '']) {
    assert.equal(directionForKey(key, ''), null, JSON.stringify(key));
  }
  assert.equal(directionForKey('q', 'KeyQ'), null);
});

test('Space and P toggle pause', () => {
  assert.equal(isPauseKey(' '), true);
  assert.equal(isPauseKey('Spacebar'), true);
  assert.equal(isPauseKey('p'), true);
  assert.equal(isPauseKey('P'), true);
  assert.equal(isPauseKey('Enter'), false);
  assert.equal(isPauseKey('ArrowUp'), false);
});

test('swipes shorter than the threshold are ignored', () => {
  assert.equal(SWIPE_THRESHOLD, 24);
  assert.equal(swipeDirection(0, 0), null);
  assert.equal(swipeDirection(23, -23), null);
  assert.equal(swipeDirection(24, 0), 'right');
  assert.equal(swipeDirection(0, -24), 'up');
});

test('a swipe follows its dominant axis', () => {
  assert.equal(swipeDirection(40, 10), 'right');
  assert.equal(swipeDirection(-40, 39), 'left');
  assert.equal(swipeDirection(10, 40), 'down');
  assert.equal(swipeDirection(-5, -60), 'up');
  assert.equal(swipeDirection(30, 30), 'down', 'a perfect diagonal resolves vertically');
  assert.equal(swipeDirection(10, 0, 8), 'right', 'custom threshold');
});
