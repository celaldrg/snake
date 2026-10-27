/**
 * Binds keyboard, swipe and on-screen pad input to game callbacks.
 * @module controls
 */
import { directionForKey, isPauseKey, swipeDirection } from './input.js';

/**
 * @typedef {object} ControlHandlers
 * @property {(direction: import('./game.js').Direction) => boolean} onSteer - Returns whether it was used.
 * @property {() => boolean} onPause - Space / P; returns whether it was used.
 * @property {() => boolean} onConfirm - Enter; returns whether it was used.
 * @property {() => void} onTouch - First touch seen, so touch-only UI can be shown.
 */

const isButtonLike = (target) => target instanceof Element && target.closest('button, a, input, select, textarea') !== null;

function handleKey(event, handlers) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = directionForKey(event.key, event.code);
  let used = false;
  if (direction) used = handlers.onSteer(direction);
  else if (isPauseKey(event.key) && !event.repeat) used = handlers.onPause();
  else if (event.key === 'Enter' && !isButtonLike(event.target)) used = handlers.onConfirm();
  if (used) event.preventDefault();
}

/** Swipes on the play area: each stretch of about SWIPE_THRESHOLD px is one turn. */
function bindSwipe(surface, onSteer) {
  let origin = null;
  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    origin = { id: event.pointerId, x: event.clientX, y: event.clientY };
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove', (event) => {
    if (!origin || event.pointerId !== origin.id) return;
    const direction = swipeDirection(event.clientX - origin.x, event.clientY - origin.y);
    if (!direction) return;
    onSteer(direction);
    origin = { id: origin.id, x: event.clientX, y: event.clientY };
  });
  const end = (event) => {
    if (origin && event.pointerId === origin.id) origin = null;
  };
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
}

/** On-screen arrows react on pointerdown for speed; keyboard/assistive clicks still work. */
function bindPad(pad, onSteer) {
  const directionOf = (event) => event.target instanceof Element
    && event.target.closest('[data-dir]')?.getAttribute('data-dir');
  pad.addEventListener('pointerdown', (event) => {
    const direction = directionOf(event);
    if (!direction) return;
    event.preventDefault();
    onSteer(direction);
  });
  pad.addEventListener('click', (event) => {
    const direction = directionOf(event);
    if (direction && event.detail === 0) onSteer(direction);
  });
}

/**
 * Wires all player input.
 * @param {{ surface: HTMLElement, pad: HTMLElement }} elements - Play area and arrow pad.
 * @param {ControlHandlers} handlers
 */
export function bindControls({ surface, pad }, handlers) {
  document.addEventListener('keydown', (event) => handleKey(event, handlers));
  bindSwipe(surface, handlers.onSteer);
  bindPad(pad, handlers.onSteer);
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') handlers.onTouch();
  }, { passive: true });
}
