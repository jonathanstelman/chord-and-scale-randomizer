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

// `fallen` mirrored. Which way a chair drops is composition rather than meaning, and it
// depends on where it sits: one in a lower-right corner has to fall away from the panel,
// or it reads as toppling back into the content. The translate flips with the rotation
// because it runs in the already-rotated axes.
const FALLEN_RIGHT_STYLE = {
  transform: 'rotate(72deg) translate(2%, 6%)',
  transformOrigin: '50% 64%',
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
 * neighbouring text already conveys. `fallRight` mirrors the `fallen` pose.
 */
export default function Chair({
  pose = 'upright', size = 34, className, label, fallRight = false,
}) {
  const art = CHAIR_ART[pose];
  if (!art) return null;

  const poseStyle = fallRight && pose === 'fallen' ? FALLEN_RIGHT_STYLE : POSE_STYLE[pose];

  return (
    <svg
      className={className}
      viewBox={CHAIR_VIEWBOX}
      width={size}
      height={Math.round(size * ASPECT)}
      style={{ display: 'block', overflow: 'visible', ...poseStyle }}
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
