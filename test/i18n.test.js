import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, isLanguage, otherLanguage, translate } from '../src/i18n.js';
import { SPEED_LEVELS } from '../src/speed.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('English is the default and Turkish the other language', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.deepEqual([...LANGUAGES], ['en', 'tr']);
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
  assert.equal(isLanguage('tr'), true);
  assert.equal(isLanguage('de'), false);
  assert.equal(isLanguage(undefined), false);
});

test('both languages have the same keys, no empty strings and matching placeholders', () => {
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), en);
  for (const key of en) {
    for (const lang of LANGUAGES) assert.ok(STRINGS[lang][key].trim().length > 0, `${lang}.${key}`);
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), key);
  }
});

test('translate fills placeholders and falls back safely', () => {
  assert.equal(translate('en', 'bestOn', { speed: 'Fast', score: 45 }), 'Best on Fast: 45');
  assert.equal(translate('tr', 'bestOn', { speed: 'Hızlı', score: 45 }), 'Hızlı rekoru: 45');
  assert.equal(translate('tr', 'newGame'), 'Yeni oyun');
  assert.equal(translate('xx', 'newGame'), 'New game', 'unknown language falls back to English');
  assert.equal(translate('en', 'no_such_key'), 'no_such_key');
  assert.equal(translate('en', 'constructor'), 'constructor', 'prototype keys are not strings');
  assert.equal(translate('en', 'bestOn'), 'Best on {speed}: {score}', 'missing params stay visible');
});

test('every key used by the page and by the speed levels exists', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(used.length > 20, 'the page marks its strings for translation');
  const dynamic = SPEED_LEVELS.map((level) => `speed_${level}`).concat([
    'title', 'switchLanguage', 'modeSummary', 'bestOn', 'pause', 'resume', 'walls', 'wrap',
    'gameOver', 'boardFull', 'causeWall', 'causeSelf', 'causeWon',
  ]);
  for (const key of [...used, ...dynamic]) {
    for (const lang of LANGUAGES) assert.ok(Object.hasOwn(STRINGS[lang], key), `${lang}.${key}`);
  }
});
