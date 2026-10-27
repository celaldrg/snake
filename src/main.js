/**
 * Browser entry point: connects the game model to the canvas, overlays, HUD and texts.
 * @module main
 */
import { createGame } from './game.js';
import { createDemoGame } from './demo.js';
import { storage } from './storage.js';
import { loadBestScores, submitScore } from './scores.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { otherLanguage, translate } from './i18n.js';
import { createRenderer } from './render.js';
import { bindControls } from './controls.js';

const byId = (id) => document.getElementById(id);

const ui = {
  board: byId('board'),
  canvas: byId('canvas'),
  pad: byId('dpad'),
  score: byId('score'),
  best: byId('best'),
  mode: byId('mode'),
  pause: byId('pause'),
  newGame: byId('new-game'),
  language: byId('language'),
  overlays: { start: byId('start-overlay'), pause: byId('pause-overlay'), over: byId('over-overlay') },
  speedButtons: [...document.querySelectorAll('[data-speed]')],
  edgeButtons: [...document.querySelectorAll('[data-wrap]')],
  startBest: byId('start-best'),
  play: byId('play'),
  resume: byId('resume'),
  again: byId('again'),
  settings: byId('settings'),
  overTitle: byId('over-title'),
  overCause: byId('over-cause'),
  overScore: byId('over-score'),
  overBest: byId('over-best'),
  newBest: byId('new-best'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const renderer = createRenderer(ui.canvas);

const app = {
  prefs: loadPrefs(storage),
  best: loadBestScores(storage),
  game: /** @type {ReturnType<typeof createGame>} */ (null),
  demo: false,
  frozen: false,
  overlay: /** @type {'start' | 'pause' | 'over' | null} */ (null),
  result: /** @type {{ best: number, isNewBest: boolean } | null} */ (null),
  lastFrame: 0,
};

const t = (key, params) => translate(app.prefs.lang, key, params);
const statusOf = () => app.game.getState().status;

function makeGame() {
  app.demo = false;
  app.frozen = false;
  app.result = null;
  return createGame({ speed: app.prefs.speed, wrap: app.prefs.wrap, seed: Date.now() });
}

function focusBoard() {
  ui.board.focus({ preventScroll: true });
}

function showOverlay(name) {
  app.overlay = name;
  for (const [key, element] of Object.entries(ui.overlays)) {
    const visible = key === name;
    element.classList.toggle('is-visible', visible);
    element.inert = !visible;
  }
  renderStart();
  renderOver();
  renderHud();
}

function newGame() {
  app.game = makeGame();
  showOverlay('start');
}

function play() {
  if (statusOf() !== 'ready') app.game = makeGame();
  app.game.start();
  showOverlay(null);
  focusBoard();
}

function togglePause() {
  const status = statusOf();
  if (status !== 'running' && status !== 'paused') return false;
  app.frozen = false;
  const paused = app.game.togglePause() === 'paused';
  showOverlay(paused ? 'pause' : null);
  if (!paused) focusBoard();
  return true;
}

function steer(direction) {
  const status = statusOf();
  if (status === 'over' || status === 'won') return false;
  app.frozen = false;
  if (status === 'ready') play();
  if (status === 'paused') togglePause();
  app.game.turn(direction);
  return true;
}

function confirm() {
  if (app.overlay === 'start' || app.overlay === 'over') play();
  else if (app.overlay === 'pause') togglePause();
  else return false;
  return true;
}

function finish() {
  const { speed, score } = app.game.getState();
  app.result = app.demo
    ? { best: Math.max(app.best[speed], score), isNewBest: false }
    : submitScore(storage, speed, score);
  app.best = loadBestScores(storage);
  showOverlay('over');
}

function chooseSettings(changes) {
  app.prefs = { ...app.prefs, ...changes };
  savePrefs(storage, app.prefs);
  app.game = makeGame();
  showOverlay('start');
}

function toggleLanguage() {
  app.prefs = { ...app.prefs, lang: otherLanguage(app.prefs.lang) };
  savePrefs(storage, app.prefs);
  renderTexts();
}

function renderTexts() {
  document.documentElement.lang = app.prefs.lang;
  document.title = t('title');
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.getAttribute('data-i18n'));
  }
  for (const element of document.querySelectorAll('[data-i18n-label]')) {
    element.setAttribute('aria-label', t(element.getAttribute('data-i18n-label')));
  }
  ui.language.textContent = otherLanguage(app.prefs.lang).toUpperCase();
  ui.language.setAttribute('aria-label', t('switchLanguage'));
  renderStart();
  renderOver();
  renderHud();
}

function renderHud() {
  const state = app.game.getState();
  const paused = state.status === 'paused';
  ui.score.textContent = String(state.score);
  ui.best.textContent = String(Math.max(app.best[state.speed], state.score));
  ui.mode.textContent = t('modeSummary', {
    speed: t(`speed_${state.speed}`),
    edges: t(state.wrap ? 'wrap' : 'walls'),
  });
  ui.pause.disabled = state.status !== 'running' && !paused;
  ui.pause.classList.toggle('is-paused', paused);
  ui.pause.setAttribute('aria-label', t(paused ? 'resume' : 'pause'));
  ui.board.dataset.mode = state.wrap ? 'wrap' : 'walls';
}

function renderStart() {
  const { speed, wrap } = app.prefs;
  for (const button of ui.speedButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.speed === speed));
  }
  for (const button of ui.edgeButtons) {
    button.setAttribute('aria-pressed', String((button.dataset.wrap === 'true') === wrap));
  }
  ui.startBest.textContent = t('bestOn', { speed: t(`speed_${speed}`), score: app.best[speed] });
}

function renderOver() {
  if (!app.result) return;
  const { status, cause, score } = app.game.getState();
  ui.overTitle.textContent = t(status === 'won' ? 'boardFull' : 'gameOver');
  ui.overCause.textContent = t(status === 'won' ? 'causeWon' : cause === 'wall' ? 'causeWall' : 'causeSelf');
  ui.overScore.textContent = String(score);
  ui.overBest.textContent = String(app.result.best);
  ui.newBest.hidden = !app.result.isNewBest;
}

function bump(element) {
  if (reducedMotion.matches) return;
  element.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
    { duration: 220, easing: 'ease-out' },
  );
}

function handleEvents(events) {
  if (events.includes('ate')) {
    renderHud();
    bump(ui.score);
  }
  if (events.includes('died') || events.includes('won')) finish();
}

function frame(now) {
  const dt = app.lastFrame ? Math.min(now - app.lastFrame, 250) : 0;
  app.lastFrame = now;
  if (!app.frozen) handleEvents(app.game.update(dt));
  renderer.draw(app.game.getState(), reducedMotion.matches ? 0 : now);
  window.requestAnimationFrame(frame);
}

function onVisibilityChange() {
  if (document.hidden && statusOf() === 'running' && !app.frozen) {
    app.game.pause();
    showOverlay('pause');
  }
}

function bindButtons() {
  ui.newGame.addEventListener('click', newGame);
  ui.language.addEventListener('click', toggleLanguage);
  ui.pause.addEventListener('click', togglePause);
  ui.play.addEventListener('click', play);
  ui.resume.addEventListener('click', togglePause);
  ui.again.addEventListener('click', play);
  ui.settings.addEventListener('click', newGame);
  for (const button of ui.speedButtons) {
    button.addEventListener('click', () => chooseSettings({ speed: button.dataset.speed }));
  }
  for (const button of ui.edgeButtons) {
    button.addEventListener('click', () => chooseSettings({ wrap: button.dataset.wrap === 'true' }));
  }
}

function init() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  if (demo) {
    // A still snapshot for the README screenshot; any steering brings it to life.
    app.game = createDemoGame();
    app.demo = true;
    app.frozen = true;
  } else {
    app.game = makeGame();
  }
  bindButtons();
  bindControls({ surface: ui.canvas, pad: ui.pad }, {
    onSteer: steer,
    onPause: togglePause,
    onConfirm: confirm,
    onTouch: () => document.documentElement.classList.add('is-touch'),
  });
  document.addEventListener('visibilitychange', onVisibilityChange);
  renderTexts();
  showOverlay(demo ? null : 'start');
  renderer.resize();
  new ResizeObserver(() => renderer.resize()).observe(ui.canvas);
  window.addEventListener('resize', () => renderer.resize());
  window.requestAnimationFrame(() => document.documentElement.classList.remove('preload'));
  window.requestAnimationFrame(frame);
}

init();
