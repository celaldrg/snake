import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';
import { PREFS_KEY, loadPrefs, savePrefs } from '../src/prefs.js';

function memoryStore() {
  const data = new Map();
  return {
    data,
    store: createStorage(() => ({
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, String(value)),
    })),
  };
}

test('a first visit gets English, normal speed and walls', () => {
  assert.deepEqual(loadPrefs(memoryStore().store), { lang: 'en', speed: 'normal', wrap: false });
});

test('preferences round-trip through storage', () => {
  const { store } = memoryStore();
  assert.equal(savePrefs(store, { lang: 'tr', speed: 'insane', wrap: true }), true);
  assert.deepEqual(loadPrefs(store), { lang: 'tr', speed: 'insane', wrap: true });
});

test('invalid or corrupt fields fall back to defaults one by one', () => {
  const { data, store } = memoryStore();
  data.set(PREFS_KEY, JSON.stringify({ lang: 'de', speed: 'warp', wrap: 'yes' }));
  assert.deepEqual(loadPrefs(store), { lang: 'en', speed: 'normal', wrap: false });
  data.set(PREFS_KEY, JSON.stringify({ lang: 'tr', speed: 'nope' }));
  assert.deepEqual(loadPrefs(store), { lang: 'tr', speed: 'normal', wrap: false });
  data.set(PREFS_KEY, '"just a string"');
  assert.deepEqual(loadPrefs(store), { lang: 'en', speed: 'normal', wrap: false });
  data.set(PREFS_KEY, '{broken');
  assert.deepEqual(loadPrefs(store), { lang: 'en', speed: 'normal', wrap: false });
});

test('blocked storage (private mode) never crashes', () => {
  const blocked = createStorage(() => { throw new Error('SecurityError'); });
  assert.deepEqual(loadPrefs(blocked), { lang: 'en', speed: 'normal', wrap: false });
  assert.equal(savePrefs(blocked, { lang: 'tr', speed: 'fast', wrap: true }), false);
});
