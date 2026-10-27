/**
 * English and Turkish UI strings with a tiny lookup helper. Pure: no DOM access.
 * @module i18n
 */

/** @typedef {'en' | 'tr'} Language */

/** Supported languages; the first one is the default. */
export const LANGUAGES = Object.freeze(/** @type {Language[]} */ (['en', 'tr']));

/** Language used on a first visit. */
export const DEFAULT_LANGUAGE = 'en';

/** Every visible string, keyed by language. Both tables have the same keys. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    title: 'Snake',
    newGame: 'New game',
    switchLanguage: 'TR – switch to Turkish',
    score: 'Score',
    best: 'Best',
    pause: 'Pause',
    resume: 'Resume',
    speed: 'Speed',
    speed_slow: 'Slow',
    speed_normal: 'Normal',
    speed_fast: 'Fast',
    speed_insane: 'Insane',
    edges: 'Edges',
    walls: 'Walls',
    wrap: 'Wrap',
    modeSummary: '{speed} · {edges}',
    bestOn: 'Best on {speed}: {score}',
    play: 'Play',
    hintKeys: 'Arrows or WASD to steer · Space to pause',
    hintTouch: 'Swipe on the board or use the arrow pad',
    paused: 'Paused',
    pausedHint: 'Press Space to continue',
    gameOver: 'Game over',
    boardFull: 'Board cleared!',
    causeWall: 'You hit a wall.',
    causeSelf: 'You ran into yourself.',
    causeWon: 'Every cell is snake. Impressive!',
    newBest: 'New best!',
    playAgain: 'Play again',
    settings: 'Settings',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    board: 'Snake board',
    controls: 'Direction pad',
    source: 'Source on GitHub',
  }),
  tr: Object.freeze({
    title: 'Yılan',
    newGame: 'Yeni oyun',
    switchLanguage: 'EN – İngilizceye geç',
    score: 'Puan',
    best: 'En iyi',
    pause: 'Duraklat',
    resume: 'Devam et',
    speed: 'Hız',
    speed_slow: 'Yavaş',
    speed_normal: 'Normal',
    speed_fast: 'Hızlı',
    speed_insane: 'Çılgın',
    edges: 'Kenarlar',
    walls: 'Duvarlı',
    wrap: 'Geçişli',
    modeSummary: '{speed} · {edges}',
    bestOn: '{speed} rekoru: {score}',
    play: 'Oyna',
    hintKeys: 'Yön tuşları veya WASD ile yönlendir · Boşluk ile duraklat',
    hintTouch: 'Tahtada kaydır ya da yön tuşlarını kullan',
    paused: 'Duraklatıldı',
    pausedHint: 'Devam etmek için Boşluk tuşuna bas',
    gameOver: 'Oyun bitti',
    boardFull: 'Tahta doldu!',
    causeWall: 'Duvara çarptın.',
    causeSelf: 'Kendine çarptın.',
    causeWon: 'Her hücre yılan oldu. Harika!',
    newBest: 'Yeni rekor!',
    playAgain: 'Tekrar oyna',
    settings: 'Ayarlar',
    up: 'Yukarı',
    down: 'Aşağı',
    left: 'Sol',
    right: 'Sağ',
    board: 'Yılan oyun tahtası',
    controls: 'Yön tuşları',
    source: "GitHub'da kaynak kod",
  }),
});

/**
 * Tells whether a value is a supported language code.
 * @param {unknown} value
 * @returns {value is Language}
 */
export function isLanguage(value) {
  return typeof value === 'string' && LANGUAGES.includes(/** @type {Language} */ (value));
}

/**
 * Returns the language the toggle switches to.
 * @param {string} lang
 * @returns {Language}
 */
export function otherLanguage(lang) {
  return lang === 'tr' ? 'en' : 'tr';
}

/**
 * Looks up a string and fills `{name}` placeholders. Unknown languages fall back to
 * English and unknown keys to the key itself, so a typo never crashes the UI.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function translate(lang, key, params = {}) {
  const table = STRINGS[isLanguage(lang) ? lang : DEFAULT_LANGUAGE];
  const template = Object.hasOwn(table, key) ? table[key] : key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    (Object.hasOwn(params, name) ? String(params[name]) : match));
}
