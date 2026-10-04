// One pinned flight through the particle field. Each stop names the formation the grain holds there (see
// field/Field.jsx ORDER); between stops the grain travels on staggered arcs. Holds at each stop, eased travel between.
export const STOPS = ['hero', 'code', 'public', 'deposit', 'inside', 'withdraw', 'vault', 'terminal', 'close'];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const travel = (x) => { const k = clamp((x - 0.24) / 0.52); return k * k * k * (k * (k * 6 - 15) + 10); };

export function progressOf(track) {
  if (!track) return 0;
  const r = track.getBoundingClientRect(), span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 0;
}

/** Where the flight is: f in stop units, the travelling segment and its eased progress. Reduced motion snaps. */
export function stateAt(t, snap = false) {
  const f = clamp(t) * (STOPS.length - 1), seg = Math.min(STOPS.length - 2, Math.floor(f));
  const k = snap ? +(f - seg >= 0.5) : travel(f - seg);
  return { f, seg, k, snap };
}

/** 1 while a chapter's stop holds, fading out before the grain starts to move. */
export const activation = (f, i, snap) => snap ? +(Math.round(f) === i) : clamp(1 - (Math.abs(f - i) - 0.2) / 0.18);
