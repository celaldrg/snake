/**
 * Canvas drawing of the board, food and snake. It only reads a game state snapshot.
 * @module render
 */

const PALETTE = Object.freeze({
  board: '#0b1324',
  checker: 'rgba(148, 163, 184, 0.025)',
  grid: 'rgba(148, 163, 184, 0.07)',
  head: [74, 222, 128],
  tail: [21, 128, 61],
  headGlow: 'rgba(34, 197, 94, 0.55)',
  shine: 'rgba(255, 255, 255, 0.10)',
  eye: '#f8fafc',
  pupil: '#0f172a',
  deadEye: '#0f172a',
  foodLight: '#fecdd3',
  food: '#f43f5e',
  foodDark: '#be123c',
  foodGlow: 'rgba(244, 63, 94, 0.30)',
  leaf: '#a3e635',
});

const HEAD_INSET = 0.04;
const BODY_INSET = 0.1;
const NECK_INSET = 0.22;
const MAX_PIXEL_RATIO = 3;

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function measure(state, width, height) {
  const cell = Math.min(width / state.cols, height / state.rows);
  return {
    cell,
    cols: state.cols,
    rows: state.rows,
    x0: (width - cell * state.cols) / 2,
    y0: (height - cell * state.rows) / 2,
  };
}

function centerOf(layout, cell) {
  return { x: layout.x0 + (cell.x + 0.5) * layout.cell, y: layout.y0 + (cell.y + 0.5) * layout.cell };
}

function segmentColor(index, length) {
  const t = length > 1 ? index / (length - 1) : 0;
  const [r, g, b] = PALETTE.head.map((channel, i) => Math.round(channel + (PALETTE.tail[i] - channel) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawBoard(ctx, layout, width, height, pixel) {
  ctx.fillStyle = PALETTE.board;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = PALETTE.checker;
  for (let y = 0; y < layout.rows; y += 1) {
    for (let x = (y % 2); x < layout.cols; x += 2) {
      ctx.fillRect(layout.x0 + x * layout.cell, layout.y0 + y * layout.cell, layout.cell, layout.cell);
    }
  }
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = pixel;
  ctx.beginPath();
  for (let x = 1; x < layout.cols; x += 1) {
    const px = layout.x0 + x * layout.cell;
    ctx.moveTo(px, layout.y0);
    ctx.lineTo(px, layout.y0 + layout.rows * layout.cell);
  }
  for (let y = 1; y < layout.rows; y += 1) {
    const py = layout.y0 + y * layout.cell;
    ctx.moveTo(layout.x0, py);
    ctx.lineTo(layout.x0 + layout.cols * layout.cell, py);
  }
  ctx.stroke();
}

function drawFood(ctx, layout, food, time) {
  const { x, y } = centerOf(layout, food);
  const r = layout.cell * 0.32 * (1 + 0.06 * Math.sin(time / 260));
  const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.4);
  glow.addColorStop(0, PALETTE.foodGlow);
  glow.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);

  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, PALETTE.foodLight);
  body.addColorStop(0.45, PALETTE.food);
  body.addColorStop(1, PALETTE.foodDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.leaf;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.35, y - r * 0.95, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function isNeighbour(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/** Fills the gap between two touching segments so the body reads as one piece. */
function drawNeck(ctx, layout, from, to) {
  const a = centerOf(layout, from);
  const b = centerOf(layout, to);
  const half = layout.cell * (0.5 - NECK_INSET);
  ctx.fillRect(Math.min(a.x, b.x) - half, Math.min(a.y, b.y) - half,
    Math.abs(a.x - b.x) + half * 2, Math.abs(a.y - b.y) + half * 2);
}

function drawSegment(ctx, layout, cell, inset) {
  const size = layout.cell * (1 - inset * 2);
  const x = layout.x0 + (cell.x + inset) * layout.cell;
  const y = layout.y0 + (cell.y + inset) * layout.cell;
  roundRectPath(ctx, x, y, size, size, size * 0.34);
  ctx.fill();
}

function drawShine(ctx, layout, cell) {
  const { x, y } = centerOf(layout, cell);
  ctx.fillStyle = PALETTE.shine;
  ctx.beginPath();
  ctx.arc(x - layout.cell * 0.12, y - layout.cell * 0.12, layout.cell * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(ctx, layout, head, direction, dead) {
  const { x, y } = centerOf(layout, head);
  const forward = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  const side = [-forward[1], forward[0]];
  const c = layout.cell;
  for (const sign of [-1, 1]) {
    const ex = x + forward[0] * c * 0.16 + side[0] * c * 0.2 * sign;
    const ey = y + forward[1] * c * 0.16 + side[1] * c * 0.2 * sign;
    if (dead) {
      drawCross(ctx, ex, ey, c * 0.1);
      continue;
    }
    ctx.fillStyle = PALETTE.eye;
    ctx.beginPath();
    ctx.arc(ex, ey, c * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.pupil;
    ctx.beginPath();
    ctx.arc(ex + forward[0] * c * 0.055, ey + forward[1] * c * 0.055, c * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCross(ctx, x, y, r) {
  ctx.strokeStyle = PALETTE.deadEye;
  ctx.lineWidth = r * 0.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x - r, y + r);
  ctx.stroke();
}

function drawSnake(ctx, layout, state) {
  const { snake } = state;
  for (let i = snake.length - 1; i > 0; i -= 1) {
    ctx.fillStyle = segmentColor(i, snake.length);
    if (isNeighbour(snake[i], snake[i - 1])) drawNeck(ctx, layout, snake[i], snake[i - 1]);
    drawSegment(ctx, layout, snake[i], BODY_INSET);
    drawShine(ctx, layout, snake[i]);
  }
  ctx.save();
  ctx.shadowColor = PALETTE.headGlow;
  ctx.shadowBlur = layout.cell * 0.7;
  ctx.fillStyle = segmentColor(0, snake.length);
  drawSegment(ctx, layout, snake[0], HEAD_INSET);
  ctx.restore();
  drawEyes(ctx, layout, snake[0], state.direction, state.status === 'over');
}

/**
 * Creates a renderer bound to a canvas. Call `resize()` whenever the canvas changes
 * size on screen; it matches the backing store to the device pixel ratio.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ resize: () => void, draw: (state: import('./game.js').GameState, time?: number) => void }}
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { width: 1, height: 1, ratio: 1 };

  function resize() {
    view.ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    view.width = Math.max(1, canvas.clientWidth);
    view.height = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(view.width * view.ratio);
    canvas.height = Math.round(view.height * view.ratio);
  }

  /**
   * Draws one frame.
   * @param {import('./game.js').GameState} state
   * @param {number} [time] - Animation clock in ms; pass 0 to keep the food still.
   */
  function draw(state, time = 0) {
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    const layout = measure(state, view.width, view.height);
    drawBoard(ctx, layout, view.width, view.height, 1 / view.ratio);
    if (state.food) drawFood(ctx, layout, state.food, time);
    drawSnake(ctx, layout, state);
  }

  return { resize, draw };
}
