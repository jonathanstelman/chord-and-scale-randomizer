// Chair motif generator — issue #21.
//
// This is the tool the shipped chairs were baked from, not a runtime dependency.
// `src/components/Chair.jsx` holds static path data produced by this script; nothing
// here runs in the browser. Keep it if you ever want to redraw the motif — the whole
// design conversation is reproducible from these parameters plus a seed.
//
//   node chair-generator.mjs --list
//   node chair-generator.mjs --variant E1 --accent cobalt        # one SVG
//   node chair-generator.mjs --bake                              # the four shipped chairs
//
// See ./README.md for why each parameter is what it is.

// ---------------------------------------------------------------------------
// Locked settings (chosen 2026-09-06). Changing these changes the drawn chair.
// ---------------------------------------------------------------------------
export const LOCKED = {
  weight: 0.7,   // stroke-weight multiplier
  jank: 1,       // wobble amount: jitter, width swell, and curve irregularity
  shade: false,  // graphite scribble inside the backrest — off
};

// The chairs that actually ship, with the seeds they were drawn with. The seed is
// part of the design: it fixes which random hand drew this particular chair, so a
// rebuild reproduces the exact artwork rather than a fresh roll.
export const SHIPPED = [
  { id: 'upright', variant: 'E1', accent: 'cobalt', seed: 1634, width: 34 },
  { id: 'tipping', variant: 'E2', accent: 'brass',  seed: 2247, width: 34 },
  { id: 'fallen',  variant: 'E6', accent: 'flame',  seed: 2860, width: 40 },
  { id: 'hero',    variant: 'E1', accent: 'cobalt', seed: 1243, width: 92 },
];

// Poses. Rotating past ~80deg squeezes the chair into an unreadable bracket, so
// `fallen` stops at 72. The masthead's optical spacing corrections live in App.css,
// not here — they depend on neighbouring chairs, which this script knows nothing about.
export const POSES = {
  upright: { rotate: 0,   originX: '50%', originY: '50%', translate: null },
  tipping: { rotate: -21, originX: '70%', originY: '88%', translate: null },
  fallen:  { rotate: -72, originX: '50%', originY: '64%', translate: '-2%, 6%' },
};

// Ten variations explored; E1, E2 and E6 were chosen. The rest are kept because
// "close to E but a bit more X" is a likely future request.
export const VARIANTS = [
  { key: 'E1',  seatTilt: -9,  legLen: 33, splay: 5, backTilt: 3, backScale: 1.00, stemAngle: 90, stemMode: 'splay' },
  { key: 'E2',  seatTilt: -9,  legLen: 33, splay: 5, backTilt: 3, backScale: 1.00, stemAngle: 80, stemMode: 'splay' },
  { key: 'E3',  seatTilt: -8,  legLen: 34, splay: 5, backTilt: 2, backScale: 1.00, stemAngle: 68, stemMode: 'splay' },
  { key: 'E4',  seatTilt: -8,  legLen: 34, splay: 6, backTilt: 2, backScale: 1.02, stemAngle: 56, stemMode: 'splay' },
  { key: 'E5',  seatTilt: -10, legLen: 32, splay: 6, backTilt: 4, backScale: 1.04, stemAngle: 46, stemMode: 'splay' },
  { key: 'E6',  seatTilt: -9,  legLen: 33, splay: 5, backTilt: 3, backScale: 1.00, stemAngle: 78, stemMode: 'converge' },
  { key: 'E7',  seatTilt: -8,  legLen: 35, splay: 5, backTilt: 2, backScale: 0.98, stemAngle: 62, stemMode: 'converge' },
  { key: 'E8',  seatTilt: -10, legLen: 33, splay: 4, backTilt: 5, backScale: 1.00, stemAngle: 72, stemMode: 'rake' },
  { key: 'E9',  seatTilt: -11, legLen: 36, splay: 4, backTilt: 6, backScale: 0.98, stemAngle: 58, stemMode: 'rake' },
  { key: 'E10', seatTilt: -7,  legLen: 38, splay: 6, backTilt: 1, backScale: 1.02, stemAngle: 66, stemMode: 'rake-back' },
];

export const VIEWBOX = { w: 100, h: 132 };

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

// mulberry32 — small, fast, and reproducible across platforms, which matters because
// the seed is part of the design.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cr(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

function densifyOpen(pts, per) {
  const out = [];
  const n = pts.length;
  const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < per; j++) out.push(cr(P(i - 1), P(i), P(i + 1), P(i + 2), j / per));
  }
  out.push(pts[n - 1]);
  return out;
}

function densifyClosed(pts, per) {
  const out = [];
  const n = pts.length;
  const P = (i) => pts[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < per; j++) out.push(cr(P(i - 1), P(i), P(i + 1), P(i + 2), j / per));
  }
  return out;
}

// Smoothing through four bare corners rounds a quad into an oval. Planting points along
// each edge first makes the spline hug the straight runs and round only the corners,
// which is what a hand-drawn quad actually looks like.
function subdivideClosed(pts, per) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

const fmt = (pts) => pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');

// A pencil mark: a centreline offset by a half-width that swells and tapers. This is
// the whole trick — a uniform `stroke-width` cannot vary along its length, so stroked
// paths always read mechanical no matter how much you wobble them.
function ribbon(pts, wA, wB, r, jank) {
  const d = densifyOpen(pts, 9);
  const n = d.length;
  const ph = r() * 6.28;
  const ph2 = r() * 6.28;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i++) {
    const a = d[Math.max(0, i - 1)];
    const b = d[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const t = i / (n - 1);
    const w = (wA + (wB - wA) * t) * (1 + 0.3 * jank * Math.sin(t * 5.1 + ph) + 0.17 * jank * Math.sin(t * 11.3 + ph2));
    const hw = Math.max(0.18, w / 2);
    L.push([d[i][0] + nx * hw, d[i][1] + ny * hw]);
    R.push([d[i][0] - nx * hw, d[i][1] - ny * hw]);
  }
  return `M${fmt(L)} L ${fmt(R.reverse())} Z`;
}

// A closed mark drawn as an annulus: outer ring and inner ring, even-odd filled, so the
// outline itself varies in weight. `per` trades smoothness against corner-keeping — a
// pre-subdivided quad wants a low number, an organic outline a high one.
function ringMark(pts, w, r, jank, per = 4) {
  const d = densifyClosed(pts, per);
  const n = d.length;
  const ph = r() * 6.28;
  const ph2 = r() * 6.28;
  const O = [];
  const I = [];
  for (let i = 0; i < n; i++) {
    const a = d[(i - 1 + n) % n];
    const b = d[(i + 1) % n];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const t = i / n;
    const ww = w * (1 + 0.32 * jank * Math.sin(t * 6.28 * 2 + ph) + 0.16 * jank * Math.sin(t * 6.28 * 5 + ph2));
    const hw = Math.max(0.2, ww / 2);
    O.push([d[i][0] + nx * hw, d[i][1] + ny * hw]);
    I.push([d[i][0] - nx * hw, d[i][1] - ny * hw]);
  }
  return { d: `M${fmt(O)} Z M${fmt(I.reverse())} Z`, inner: `M${fmt(I)} Z` };
}

function rot(p, cx, cy, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = p[0] - cx;
  const y = p[1] - cy;
  return [cx + x * c - y * s, cy + x * s + y * c];
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------
// The chair
// ---------------------------------------------------------------------------

// Returns an array of { d, fill, fillRule?, opacity? } — the drawn parts, back to front.
// `accent` is emitted verbatim so callers can pass a CSS var: --brass has a per-theme
// value, and a baked hex would lose that fork.
export function chairParts(p, seed, opts = {}) {
  const { weight = LOCKED.weight, jank = LOCKED.jank, shade = LOCKED.shade, accent = 'var(--ca)' } = opts;
  const r = rng(seed);
  const J = 1.6 * jank;
  const j = (pt) => [pt[0] + (r() - 0.5) * J, pt[1] + (r() - 0.5) * J];
  const W = (v) => v * weight;

  const cx = 50;
  const cy = 64;
  const tilt = p.seatTilt;

  // Seat: a perspective quad, rotated by seatTilt.
  const A = rot(j([26, 50]), cx, cy, tilt); // back-left
  const B = rot(j([76, 55]), cx, cy, tilt); // back-right
  const C = rot(j([83, 79]), cx, cy, tilt); // front-right
  const D = rot(j([14, 74]), cx, cy, tilt); // front-left

  const parts = [];

  // Backrest: a teardrop, pointed at the left, floating above the seat.
  const bs = p.backScale;
  const bx = 50;
  const by = 22;
  const leaf = [[-27, 2], [-20, -7], [-6, -12], [10, -12], [23, -6], [27, 2], [20, 9], [4, 12], [-12, 11], [-22, 8]];
  const back = leaf.map((q) => {
    const pt = [bx + q[0] * bs, by + q[1] * bs * 0.96];
    return rot(rot(j(pt), bx, by, p.backTilt), cx, cy, tilt * 0.55);
  });
  const bring = ringMark(back, W(3.5), r, jank, 9);
  parts.push({ d: bring.inner, fill: accent });

  if (shade) {
    for (let s = 0; s < 7; s++) {
      const ty0 = -7 + s * 2.6;
      const x0 = -22 + r() * 5;
      const x1 = 22 - r() * 6;
      const sc = [[x0, ty0], [x0 * 0.2, ty0 + (r() - 0.5) * 1.6], [x1, ty0 + (r() - 0.5) * 1.2]].map((q) => {
        const pt = [bx + q[0] * bs, by + q[1] * bs * 0.96];
        return rot(rot(pt, bx, by, p.backTilt), cx, cy, tilt * 0.55);
      });
      parts.push({ d: ribbon(sc, W(0.5), W(0.8), r, jank), fill: 'currentColor', opacity: 0.22 });
    }
  }
  parts.push({ d: bring.d, fill: 'currentColor', fillRule: 'evenodd' });

  // Stems: deliberately thin — the weight contrast is a real feature of the reference.
  // The foot is found by casting from the stem top at stemAngle (off the horizontal)
  // until it meets the seat's back edge, so the angle is the input and the attachment
  // point falls out of it rather than the reverse.
  const MODE = { splay: [-1, 1], converge: [1, -1], rake: [1, 1], 'rake-back': [-1, -1] };
  const dirs = MODE[p.stemMode] || MODE.splay;
  const ang = (p.stemAngle * Math.PI) / 180;
  const ex = B[0] - A[0];
  const ey = B[1] - A[1];

  const stemFoot = (top, dirX) => {
    const sx = Math.cos(ang) * dirX;
    const sy = Math.sin(ang);
    const det = -sx * ey + ex * sy;
    if (Math.abs(det) < 1e-6) return lerp(A, B, 0.5);
    const t = (sx * (A[1] - top[1]) - sy * (A[0] - top[0])) / det;
    return lerp(A, B, Math.max(0.08, Math.min(0.92, t)));
  };

  const bBotL = lerp(back[7], back[8], 0.45);
  const bBotR = lerp(back[6], back[7], 0.35);
  const footL = stemFoot(bBotL, dirs[0]);
  const footR = stemFoot(bBotR, dirs[1]);
  parts.push({ d: ribbon([bBotL, j(lerp(bBotL, footL, 0.5)), footL], W(1.5), W(1.2), r, jank), fill: 'currentColor' });
  parts.push({ d: ribbon([bBotR, j(lerp(bBotR, footR, 0.5)), footR], W(1.5), W(1.2), r, jank), fill: 'currentColor' });

  // Legs: front two only.
  const L = p.legLen;
  const sp = p.splay;
  const leg = (from, dx, len, wA, wB) => {
    const mid = [from[0] + dx * 0.45, from[1] + len * 0.5];
    const end = [from[0] + dx, from[1] + len];
    return ribbon([from, j(mid), j(end)], W(wA), W(wB), r, jank);
  };
  parts.push({ d: leg([D[0] + 4, D[1] - 1], -sp, L, 3.6, 2.1), fill: 'currentColor' });
  parts.push({ d: leg([C[0] - 5, C[1] - 1], sp * 0.85, L * 0.96, 3.6, 2.1), fill: 'currentColor' });

  // Seat outline, then the rail beneath it.
  const sring = ringMark(subdivideClosed([A, B, C, D], 6), W(3.7), r, jank, 3);
  parts.push({ d: sring.d, fill: 'currentColor', fillRule: 'evenodd' });

  const rl = lerp(D, C, 0.06);
  const rr = lerp(D, C, 0.94);
  parts.push({
    d: ribbon([[rl[0] + 1, rl[1] + 6], [(rl[0] + rr[0]) / 2, (rl[1] + rr[1]) / 2 + 7.4], [rr[0] - 1, rr[1] + 6]], W(2.7), W(2.7), r, jank),
    fill: 'currentColor',
  });

  return parts;
}

export const variant = (key) => VARIANTS.find((v) => v.key === key) || VARIANTS[0];

const partToSvg = (part) =>
  `<path d="${part.d}" fill="${part.fill}"` +
  (part.fillRule ? ` fill-rule="${part.fillRule}"` : '') +
  (part.opacity ? ` opacity="${part.opacity}"` : '') +
  '/>';

export function chairSvg(key, opts = {}, seed = 1) {
  const parts = chairParts(variant(key), seed, opts);
  return (
    `<svg viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chair">\n  ` +
    parts.map(partToSvg).join('\n  ') +
    '\n</svg>\n'
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
  };
  const ACCENTS = { cobalt: 'var(--cobalt)', brass: 'var(--brass)', flame: 'var(--flame)' };

  if (argv.includes('--list')) {
    console.log('key   seat  legs  splay  stem');
    for (const v of VARIANTS) {
      console.log(
        `${v.key.padEnd(5)} ${String(v.seatTilt).padStart(3)}deg ${String(v.legLen).padStart(4)} ${String(v.splay).padStart(5)}  ${v.stemAngle}deg ${v.stemMode}`
      );
    }
  } else if (argv.includes('--bake')) {
    // Emits the four shipped chairs as JSON, ready to paste into Chair.jsx.
    const out = {};
    for (const s of SHIPPED) {
      out[s.id] = {
        variant: s.variant,
        accent: s.accent,
        seed: s.seed,
        parts: chairParts(variant(s.variant), s.seed, { ...LOCKED, accent: ACCENTS[s.accent] }),
      };
    }
    console.log(JSON.stringify(out, null, 2));
  } else {
    const key = flag('variant', 'E1');
    const accent = ACCENTS[flag('accent', 'cobalt')] || 'var(--cobalt)';
    const seed = Number(flag('seed', SHIPPED.find((s) => s.variant === key)?.seed ?? 1));
    process.stdout.write(chairSvg(key, { ...LOCKED, accent }, seed));
  }
}
