import { CHAIR_ART, CHAIR_VIEWBOX } from './chairArt';

// Pose transforms live here rather than in App.css because they're intrinsic to the
// drawing — a chair is "tipping" by virtue of this rotation, wherever it's placed.
// Spacing corrections between chairs are a separate, contextual concern and stay in
// App.css. `fallen` stops at 72deg: past roughly 80 the chair collapses into an
// unreadable bracket (see docs/design/chair-motif/README.md).
const POSE_STYLE = {
  upright: undefined,
  tipping: { transform: 'rotate(-21deg)', transformOrigin: '70% 88%' },
  fallen: { transform: 'rotate(-72deg) translate(-2%, 6%)', transformOrigin: '50% 64%' },
};

// The viewBox is taller than it is wide, so height follows from width.
const ASPECT = 132 / 100;

/**
 * One chair from the Musical Chairs motif. Artwork is baked path data
 * (`chairArt.js`); nothing is generated at runtime.
 *
 * Each pose ships with its own accent already in the path data — cobalt upright,
 * brass tipping, flame fallen — so a pose is a complete chair, not a shape needing
 * to be coloured. The frame paths use `currentColor`, which means the chair inherits
 * whatever `color` its container has and flips with the theme for free.
 *
 * Decorative by default. Pass `label` only where the chair carries meaning no
 * neighbouring text already conveys.
 */
export default function Chair({ pose = 'upright', size = 34, className, label }) {
  const art = CHAIR_ART[pose];
  if (!art) return null;

  return (
    <svg
      className={className}
      viewBox={CHAIR_VIEWBOX}
      width={size}
      height={Math.round(size * ASPECT)}
      style={{ display: 'block', overflow: 'visible', ...POSE_STYLE[pose] }}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {art.map((part, i) => (
        <path key={i} d={part.d} fill={part.fill} fillRule={part.fillRule} opacity={part.opacity} />
      ))}
    </svg>
  );
}
