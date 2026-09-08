#!/usr/bin/env node
/**
 * Signature authoring: turn a design file of SVG path centrelines into an
 * InkFlow stroke spec with pressure and timing, the way a pen would have
 * produced it.
 *
 *   node tools/sig-author.cjs <design.json> <spec-out.json>
 *
 * design.json:
 * {
 *   "name": "Ahsani", "width": 1000, "height": 420, "color": "#eef1ea",
 *   "speed": 0.9,                  // px per ms, default writing speed
 *   "strokes": [
 *     { "name": "main", "d": "M 60 300 C ...", "size": 9, "speed": 0.9,
 *       "pauseBefore": 0, "pressure": "auto" | 0.6, "taperStart": 4, "taperEnd": 14,
 *       "pressureBias": 0 }         // shifts the whole stroke thicker/thinner
 *   ]
 * }
 *
 * Pressure model ("auto"): down-strokes are heavy, up-strokes light, entries
 * and exits taper, tight curves slow the pen and press a little harder.
 */
const fs = require('fs');

const [designPath, outPath] = process.argv.slice(2);
if (!designPath || !outPath) { console.error('usage: node sig-author.cjs <design.json> <spec-out.json>'); process.exit(1); }
const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));

// ---------- path parsing (M L H V C S Q T Z, absolute and relative) ----------
function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const segs = []; // each: {type:'C', p0, c1, c2, p1} or {type:'L', p0, p1}
  let i = 0, cmd = '', cur = { x: 0, y: 0 }, start = { x: 0, y: 0 }, prevC = null, prevQ = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      const x = num(), y = num();
      cur = rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
      start = { ...cur }; prevC = prevQ = null;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      const x = num(), y = num();
      const p1 = rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
      segs.push({ type: 'L', p0: cur, p1 }); cur = p1; prevC = prevQ = null;
    } else if (C === 'H') {
      const x = num(); const p1 = { x: rel ? cur.x + x : x, y: cur.y };
      segs.push({ type: 'L', p0: cur, p1 }); cur = p1; prevC = prevQ = null;
    } else if (C === 'V') {
      const y = num(); const p1 = { x: cur.x, y: rel ? cur.y + y : y };
      segs.push({ type: 'L', p0: cur, p1 }); cur = p1; prevC = prevQ = null;
    } else if (C === 'C') {
      const a = [num(), num(), num(), num(), num(), num()];
      const o = rel ? cur : { x: 0, y: 0 };
      const c1 = { x: o.x + a[0], y: o.y + a[1] }, c2 = { x: o.x + a[2], y: o.y + a[3] }, p1 = { x: o.x + a[4], y: o.y + a[5] };
      segs.push({ type: 'C', p0: cur, c1, c2, p1 }); prevC = c2; cur = p1; prevQ = null;
    } else if (C === 'S') {
      const a = [num(), num(), num(), num()];
      const o = rel ? cur : { x: 0, y: 0 };
      const c1 = prevC ? { x: 2 * cur.x - prevC.x, y: 2 * cur.y - prevC.y } : { ...cur };
      const c2 = { x: o.x + a[0], y: o.y + a[1] }, p1 = { x: o.x + a[2], y: o.y + a[3] };
      segs.push({ type: 'C', p0: cur, c1, c2, p1 }); prevC = c2; cur = p1; prevQ = null;
    } else if (C === 'Q') {
      const a = [num(), num(), num(), num()];
      const o = rel ? cur : { x: 0, y: 0 };
      const q = { x: o.x + a[0], y: o.y + a[1] }, p1 = { x: o.x + a[2], y: o.y + a[3] };
      segs.push(quadToCubic(cur, q, p1)); prevQ = q; cur = p1; prevC = null;
    } else if (C === 'T') {
      const a = [num(), num()];
      const o = rel ? cur : { x: 0, y: 0 };
      const q = prevQ ? { x: 2 * cur.x - prevQ.x, y: 2 * cur.y - prevQ.y } : { ...cur };
      const p1 = { x: o.x + a[0], y: o.y + a[1] };
      segs.push(quadToCubic(cur, q, p1)); prevQ = q; cur = p1; prevC = null;
    } else if (C === 'Z') {
      if (cur.x !== start.x || cur.y !== start.y) segs.push({ type: 'L', p0: cur, p1: { ...start } });
      cur = { ...start }; i += 0; prevC = prevQ = null;
      if (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) cmd = 'L';
    } else { i++; }
  }
  return segs;
}
function quadToCubic(p0, q, p1) {
  return { type: 'C', p0, c1: { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) }, c2: { x: p1.x + (2 / 3) * (q.x - p1.x), y: p1.y + (2 / 3) * (q.y - p1.y) }, p1 };
}
function cubicAt(s, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * s.p0.x + 3 * mt * mt * t * s.c1.x + 3 * mt * t * t * s.c2.x + t * t * t * s.p1.x,
    y: mt * mt * mt * s.p0.y + 3 * mt * mt * t * s.c1.y + 3 * mt * t * t * s.c2.y + t * t * t * s.p1.y,
  };
}
function flatten(segs) {
  const pts = [];
  for (const s of segs) {
    if (s.type === 'L') { if (!pts.length) pts.push(s.p0); pts.push(s.p1); continue; }
    const approx = Math.hypot(s.c1.x - s.p0.x, s.c1.y - s.p0.y) + Math.hypot(s.c2.x - s.c1.x, s.c2.y - s.c1.y) + Math.hypot(s.p1.x - s.c2.x, s.p1.y - s.c2.y);
    const n = Math.max(8, Math.ceil(approx / 2));
    if (!pts.length) pts.push(s.p0);
    for (let k = 1; k <= n; k++) pts.push(cubicAt(s, k / n));
  }
  return pts;
}
function resample(pts, step) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1], b = pts[i];
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    while (acc + d >= step) {
      const r = (step - acc) / d;
      const p = { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
      out.push(p); a = p; d = Math.hypot(b.x - a.x, b.y - a.y); acc = 0;
    }
    acc += d;
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > step * 0.35) out.push(last);
  return out;
}

// ---------- pressure + timing ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function authorStroke(st, index, defaults) {
  const step = 2.5;
  const pts = resample(flatten(parsePath(st.d)), step);
  const N = pts.length;
  const speed = st.speed || defaults.speed || 0.9; // px/ms
  const bias = st.pressureBias || 0;
  const total = (N - 1) * step;
  const points = [];
  let tAcc = 0;
  for (let i = 0; i < N; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(N - 1, i + 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1;
    const down = dy / len;                 // +1 straight down, -1 straight up
    const horiz = Math.abs(dx) / len;
    // curvature from direction change
    let curv = 0;
    if (i > 0 && i < N - 1) {
      const a1 = Math.atan2(pts[i].y - prev.y, pts[i].x - prev.x), a2 = Math.atan2(next.y - pts[i].y, next.x - pts[i].x);
      let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da; curv = clamp(da / 0.6, 0, 1);
    }
    const s = i / Math.max(1, N - 1);
    let p;
    if (typeof st.pressure === 'number') p = st.pressure;
    else {
      // calligraphic: heavy on down-strokes, light on up-strokes and fast horizontals
      p = 0.42 + 0.34 * down + 0.10 * curv - 0.06 * horiz * (down < 0 ? 1 : 0);
      p += (hash(index * 1000 + i) - 0.5) * 0.05;   // hand tremor
    }
    // entry / exit taper in pressure as well as geometry
    const edge = Math.min(1, s / 0.06, (1 - s) / 0.08);
    p = clamp((p + bias) * (0.55 + 0.45 * edge), 0.06, 1);
    // timing: slower in curves, eases at start and end
    const pace = speed * (1 - 0.45 * curv) * (0.55 + 0.45 * Math.min(1, s / 0.12, (1 - s) / 0.15));
    if (i > 0) tAcc += step / Math.max(0.15, pace);
    points.push({ x: +pts[i].x.toFixed(2), y: +pts[i].y.toFixed(2), pressure: +p.toFixed(3), t: Math.round(tAcc) });
  }
  return { points, durationMs: Math.round(tAcc), length: Math.round(total) };
}

const strokes = [];
let cursor = 0;
design.strokes.forEach((st, i) => {
  const { points, durationMs, length } = authorStroke(st, i, design);
  cursor += st.pauseBefore ?? (i === 0 ? 0 : 180);
  strokes.push({
    name: st.name || `stroke-${i + 1}`,
    color: st.color || design.color || '#eef1ea',
    size: st.size || design.size || 9,
    opacity: st.opacity ?? 1,
    brush: {
      minWidthRatio: st.minWidthRatio ?? 0.18,
      maxWidthRatio: st.maxWidthRatio ?? 1.75,
      taperStart: st.taperStart ?? 3,
      taperEnd: st.taperEnd ?? 10,
      smoothing: st.smoothing ?? 0.6,
      streamline: st.streamline ?? 0.3,
      cap: true,
    },
    startMs: cursor,
    points,
    _length: length,
  });
  cursor += durationMs;
});

const spec = {
  name: design.name || 'Signature',
  width: design.width || 1000,
  height: design.height || 420,
  background: 'transparent',
  idPrefix: design.idPrefix || 'sig',
  speedMultiplier: design.speedMultiplier || 1,
  maxGapMs: design.maxGapMs ?? 320,
  tailMs: design.tailMs ?? 200,
  strokes: strokes.map(({ _length, ...s }) => s),
};
fs.writeFileSync(outPath, JSON.stringify(spec));
console.log(JSON.stringify({ strokes: strokes.map((s) => ({ name: s.name, points: s.points.length, startMs: s.startMs, length: s._length })), totalMs: cursor }));
