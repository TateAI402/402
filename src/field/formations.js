// Formations for the particle field. Every shape is drawn into an offscreen canvas, softened with a blur like the
// logo's glow, and sampled by brightness: bright pixels take more particles, the soft edges take a few. So the logo
// itself (TATE) and every other shape come out of the same grain.
// Coordinates are CSS pixels around the centre of the viewport (y up), z is a depth in [-1, 1] for parallax.

const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/** Sample n points from a canvas by brightness^gamma, mapped into a box of width w centred at (cx, cy). */
function sampleCanvas(canvas, n, { w, cx = 0, cy = 0, gamma = 1.6, depth = 0.25, seed = 1 }) {
  const { width: W, height: H } = canvas;
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const step = Math.max(1, Math.round(Math.sqrt((W * H) / 220000)));
  const cells = [], weights = [];
  let total = 0;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const v = data[(y * W + x) * 4] / 255;
    if (v < 0.04) continue;
    const wgt = Math.pow(v, gamma);
    total += wgt; cells.push(x, y); weights.push(total);
  }
  const out = new Float32Array(n * 3), r = rnd(seed), scale = w / W;
  if (!weights.length) return out;
  for (let i = 0; i < n; i++) {
    const t = r() * total;
    let lo = 0, hi = weights.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (weights[mid] < t) lo = mid + 1; else hi = mid; }
    const x = cells[lo * 2] + (r() - 0.5) * step, y = cells[lo * 2 + 1] + (r() - 0.5) * step;
    out[i * 3] = cx + (x - W / 2) * scale;
    out[i * 3 + 1] = cy - (y - H / 2) * scale;
    out[i * 3 + 2] = (r() * 2 - 1) * depth;
  }
  return out;
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); return [c, g]; };
const soften = (src, blur) => { const [c, g] = canvas(src.width, src.height); g.filter = `blur(${blur}px)`; g.drawImage(src, 0, 0); return c; };

function textCanvas(text, { font = '900 360px "Arial Black", "Arial", sans-serif', w = 1400, h = 520, blur = 16, track = 0 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#fff'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (track) g.letterSpacing = track + 'px';
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return soften(c, blur);
}

/** The gate: two soft pillars with a bright seam between them, the door the deposit goes through. */
function gateCanvas() {
  const [c, g] = canvas(1200, 800);
  g.fillStyle = '#fff';
  const pill = (x, y, w, h) => { g.beginPath(); g.roundRect(x, y, w, h, w / 2); g.fill(); };
  pill(330, 90, 150, 620); pill(720, 90, 150, 620);
  g.globalAlpha = 0.35; g.fillRect(560, 120, 80, 560); g.globalAlpha = 1;
  return soften(c, 22);
}

/** A lock: the shackle arc and the body, for the file vault. */
function lockCanvas() {
  const [c, g] = canvas(900, 900);
  g.strokeStyle = '#fff'; g.lineWidth = 70; g.lineCap = 'round';
  g.beginPath(); g.arc(450, 360, 170, Math.PI, 0); g.lineTo(620, 440); g.moveTo(280, 360); g.lineTo(280, 440); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(190, 420, 520, 400, 60); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.arc(450, 590, 46, 0, Math.PI * 2); g.fill(); g.fillRect(430, 600, 40, 110);
  return soften(c, 18);
}

/** A price chart: candles and a soft line across them, for the terminal and the agent. */
function chartCanvas() {
  const [c, g] = canvas(1600, 700);
  const r = rnd(42), pts = [];
  let y = 470;
  for (let i = 0; i < 26; i++) {
    const x = 90 + i * 56, o = y; y = Math.max(140, Math.min(600, y + (r() - 0.56) * 110)); const hi = Math.min(o, y) - 20 - r() * 40, lo = Math.max(o, y) + 20 + r() * 40;
    g.fillStyle = '#fff'; g.globalAlpha = 0.55; g.fillRect(x - 3, hi, 6, lo - hi);
    g.globalAlpha = y < o ? 1 : 0.6; g.fillRect(x - 17, Math.min(o, y), 34, Math.max(10, Math.abs(o - y)));
    pts.push([x, y]);
  }
  g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); pts.forEach(([x, yy], i) => (i ? g.lineTo(x, yy - 70) : g.moveTo(x, yy - 70))); g.stroke();
  return soften(c, 10);
}

/** Ledger: rows of short dashes and dots, the public record anyone can read. */
function ledger(n, W, H, seed, narrow) {
  const out = new Float32Array(n * 3), r = rnd(seed), rows = narrow ? 10 : 9, cols = narrow ? 18 : 48;
  const w = narrow ? W * 0.9 : W * 0.9, h = narrow ? H * 0.24 : H * 0.3, ox = 0, oy = narrow ? H * 0.29 : H * 0.0;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(r() * rows), col = Math.floor(r() * cols);
    const len = ((col * 7 + row * 3) % 5) + 1, on = (col * 31 + row * 17) % 9 > 1;
    const x = -w / 2 + (col + r() * (on ? len / 5 : 0.15)) * (w / cols), y = h / 2 - row * (h / (rows - 1)) + (r() - 0.5) * 3;
    out[i * 3] = x + ox; out[i * 3 + 1] = y + oy; out[i * 3 + 2] = (r() * 2 - 1) * 0.6;
  }
  return out;
}

/** The note: a dense cloud with a bright core, what a deposit becomes inside the pool. */
function cloud(n, W, H, seed, { cx = 0, cy = 0, sx = 0.32, sy = 0.24 } = {}) {
  const out = new Float32Array(n * 3), r = rnd(seed), s = Math.min(W, H * 1.6);
  for (let i = 0; i < n; i++) {
    const u = Math.max(1e-6, r()), v = r(), mag = Math.sqrt(-2 * Math.log(u));
    out[i * 3] = cx + mag * Math.cos(2 * Math.PI * v) * s * sx * 0.5;
    out[i * 3 + 1] = cy + mag * Math.sin(2 * Math.PI * v) * s * sy * 0.5;
    out[i * 3 + 2] = (r() * 2 - 1);
  }
  return out;
}

/** The way out: a stream leaving the cloud on the left and narrowing to a single point on the right. */
function stream(n, W, H, seed, narrow) {
  const out = new Float32Array(n * 3), r = rnd(seed), x0 = narrow ? -W * 0.5 : -W * 0.5, x1 = narrow ? W * 0.42 : W * 0.06, oy = narrow ? H * 0.18 : 0;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.8), x = x0 + (x1 - x0) * t, spread = (1 - t) * H * 0.22 + 2;
    const u = Math.max(1e-6, r()), v = r(), g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    out[i * 3] = x; out[i * 3 + 1] = oy + g * spread * 0.5 + Math.sin(t * 6) * 12 * (1 - t); out[i * 3 + 2] = (r() * 2 - 1) * (1 - t);
  }
  return out;
}

/** Load the logo once; the letters are the first and the last formation. */
let logoPromise = null;
export function loadLogo(src = '/brand/tate-mark.png') {
  logoPromise ||= new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
  return logoPromise;
}

/** Every formation for a viewport, in the order of the flight's stops. */
export function buildFormations(n, W, H, logo) {
  const narrow = W < 700;
  const markW = narrow ? W * 0.86 : Math.min(W * 0.5, 820);
  const [lc, lg] = canvas(logo.naturalWidth, logo.naturalHeight); lg.drawImage(logo, 0, 0);
  const tate = sampleCanvas(lc, n, { w: markW, cy: narrow ? H * 0.2 : H * 0.17, gamma: 1.05, depth: 0.3, seed: 11 });
  // desktop layouts per chapter: 402 centred under a wide title, the ledger as a full band, the gate between two
  // words, the note centred over four steps, the stream coming from the left, the lock between a split title, the chart
  // on the left of a live coin panel
  const four = sampleCanvas(textCanvas('402', { font: '900 400px "Arial Black", "Arial", sans-serif', blur: 18, track: -10 }), n, { w: narrow ? W * 1.35 : Math.min(W * 0.52, 860), cx: 0, cy: narrow ? H * 0.19 : -H * 0.02, gamma: 1.4, seed: 12 });
  const gate = sampleCanvas(gateCanvas(), n, { w: narrow ? W * 1.1 : Math.min(W * 0.36, 600), cx: 0, cy: narrow ? H * 0.19 : -H * 0.02, gamma: 1.2, seed: 13, depth: 0.5 });
  const lock = sampleCanvas(lockCanvas(), n, { w: narrow ? W * 0.62 : Math.min(W * 0.22, 360), cx: 0, cy: narrow ? H * 0.19 : -H * 0.01, gamma: 1.3, seed: 14 });
  const chart = sampleCanvas(chartCanvas(), n, { w: narrow ? W * 0.94 : Math.min(W * 0.56, 920), cx: narrow ? 0 : -W * 0.16, cy: narrow ? H * 0.19 : -H * 0.02, gamma: 1.1, seed: 15, depth: 0.6 });
  return {
    tate,
    four,
    ledger: ledger(n, W, H, 16, narrow),
    gate,
    cloud: cloud(n, W, H, 17, narrow ? { cy: H * 0.16, sx: 0.5, sy: 0.3 } : { cy: H * 0.05, sx: 0.2, sy: 0.12 }),
    stream: stream(n, W, H, 18, narrow),
    lock,
    chart,
  };
}
