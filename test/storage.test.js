import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';

/** In-memory stand-in for localStorage. */
function memoryBackend() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('values round-trip as JSON and missing keys give the fallback', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.set('lang', 'tr'), true);
  assert.equal(store.set('best', { slow: 40 }), true);
  assert.equal(store.get('lang', 'en'), 'tr');
  assert.deepEqual(store.get('best', {}), { slow: 40 });
  assert.equal(store.get('missing', 'fallback'), 'fallback');
});

test('corrupt data gives the fallback', () => {
  const backend = memoryBackend();
  backend.data.set('best', '{not json');
  assert.equal(createStorage(() => backend).get('best', 0), 0);
});

test('a throwing or missing backend never crashes', () => {
  const throwing = createStorage(() => ({
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  }));
  assert.equal(throwing.get('k', 'fallback'), 'fallback');
  assert.equal(throwing.set('k', 1), false);

  const denied = createStorage(() => { throw new Error('access denied'); });
  assert.equal(denied.get('k', 'fallback'), 'fallback');
  assert.equal(denied.set('k', 1), false);

  const absent = createStorage(() => undefined);
  assert.equal(absent.get('k', 'fallback'), 'fallback');
  assert.equal(absent.set('k', 1), false);
});
