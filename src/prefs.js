/**
 * Player preferences (language, speed level, edge mode), persisted through the storage helper.
 * @module prefs
 */
import { DEFAULT_LANGUAGE, isLanguage } from './i18n.js';
import { DEFAULT_SPEED, SPEED_LEVELS } from './speed.js';

/** @typedef {{ lang: import('./i18n.js').Language, speed: string, wrap: boolean }} Prefs */

/** Storage key of the preferences record. */
export const PREFS_KEY = 'snake.prefs.v1';

/**
 * Reads the preferences, replacing missing or invalid fields with defaults.
 * @param {import('./storage.js').SafeStorage} store
 * @returns {Prefs}
 */
export function loadPrefs(store) {
  const saved = store.get(PREFS_KEY, null);
  const record = saved !== null && typeof saved === 'object' ? saved : {};
  return {
    lang: isLanguage(record.lang) ? record.lang : DEFAULT_LANGUAGE,
    speed: SPEED_LEVELS.includes(record.speed) ? record.speed : DEFAULT_SPEED,
    wrap: record.wrap === true,
  };
}

/**
 * Saves the preferences.
 * @param {import('./storage.js').SafeStorage} store
 * @param {Prefs} prefs
 * @returns {boolean} Whether they were saved.
 */
export function savePrefs(store, prefs) {
  return store.set(PREFS_KEY, { lang: prefs.lang, speed: prefs.speed, wrap: prefs.wrap === true });
}
