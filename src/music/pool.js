import { CHORD_QUALITIES } from './chordQualities';
import { SCALE_TYPES } from './scaleFamilies';
import { pitchClassAccidentals } from './notes';

// "Fewer than 7 sharps or flats" — beyond this a key signature isn't really used in
// practice (the standard 12 major keys top out at 6, for F#/Gb).
const MAX_KEY_SIGNATURE_ACCIDENTALS = 6;
export const ALL_ROOTS = Array.from({ length: 12 }, (_, pc) => pc);
const SIMPLE_KEY_ROOTS = ALL_ROOTS.filter((pc) => pitchClassAccidentals(pc) <= MAX_KEY_SIGNATURE_ACCIDENTALS);

// A single flat list of every selectable tonal-center "type" (root note, triad, seventh
// chord, or scale-implied chord), each reduced to the shape the randomizer/audio engine
// need: a key, a display label + category (for grouping the settings UI), and the
// semitone intervals from the root to stack into a voicing.
export const ALL_TONAL_CENTER_TYPES = [
  ...CHORD_QUALITIES.map(({ key, label, category, intervals, hasKeySignature }) => (
    { key, label, category, intervals, hasKeySignature }
  )),
  ...SCALE_TYPES.map(({ key, label, category, chordIntervals, degreeIndex, hasKeySignature }) => (
    { key, label, category, intervals: chordIntervals, degreeIndex, hasKeySignature }
  )),
];

// Four broad difficulty tiers, each bundling one or more of the categories above. The
// settings UI shows just these by default; toggling one on/off enables/disables every
// type it covers, while the "Advanced" panel exposes the underlying types individually.
export const CORE_MODES = [
  { key: 'root', label: 'Root Notes', categories: ['Root'] },
  { key: 'triads', label: 'Triads', categories: ['Triads'] },
  { key: 'sevenths', label: 'Seventh Chords', categories: ['Seventh Chords'] },
  {
    key: 'extended',
    label: 'Extended (Scale Tones)',
    categories: [
      'Diatonic Modes', 'Melodic Minor Modes', 'Harmonic Minor Modes', 'Symmetric / Nondiatonic',
    ],
  },
];

// The standard beginner "open chord" set on guitar: these five roots (C G D E A) all get
// open-position majors, but only three of them (A D E) also get an open-position minor —
// Cm/Gm are barre shapes, not open ones, so they're deliberately left out even though
// their majors are in the list. That asymmetry can't be expressed as "these roots" ×
// "these qualities" (see pickRandomTonalCenter), so it's its own explicit pair list
// rather than an enabledTypes/enabledRoots combination.
export const GUITAR_OPEN_CHORD_PAIRS = [
  { rootPc: 0, typeKey: 'maj' }, // C
  { rootPc: 7, typeKey: 'maj' }, // G
  { rootPc: 2, typeKey: 'maj' }, // D
  { rootPc: 4, typeKey: 'maj' }, // E
  { rootPc: 9, typeKey: 'maj' }, // A
  { rootPc: 9, typeKey: 'min' }, // Am
  { rootPc: 2, typeKey: 'min' }, // Dm
  { rootPc: 4, typeKey: 'min' }, // Em
];

// One-click starting points layered on top of CORE_MODES: each sets enabledTypes to
// *exactly* its categories (not merged with whatever's already on), so picking one is a
// clean reset. The manual mode/advanced checkboxes remain the "customize from here" path
// afterward. Only Beginner also touches bpm — the rest are pure type selections. Guitar
// is the odd one out: it sets `pairs` instead of `categories`, drawing from
// GUITAR_OPEN_CHORD_PAIRS directly rather than the enabledTypes/enabledRoots filters (see
// applyPreset in useSettings.js) — and, unlike the others, it deliberately leaves
// enabledTypes/enabledRoots untouched so "customize from here" (any manual checkbox edit)
// falls back to whatever general filter was set before Guitar was picked.
export const PRESETS = [
  { key: 'beginner', label: 'Beginner', categories: ['Root', 'Triads'], bpm: 50 },
  { key: 'chords', label: 'Chords Only', categories: ['Triads', 'Seventh Chords'] },
  {
    key: 'scales',
    label: 'Scales Only',
    categories: CORE_MODES.find((m) => m.key === 'extended').categories,
  },
  { key: 'everything', label: 'Everything', categories: CORE_MODES.flatMap((m) => m.categories) },
  { key: 'guitar', label: 'Guitar', pairs: GUITAR_OPEN_CHORD_PAIRS },
];

export function typeKeysInCategories(categories) {
  return ALL_TONAL_CENTER_TYPES.filter((t) => categories.includes(t.category)).map((t) => t.key);
}

// 'all' | 'some' | 'none' — drives a tri-state (possibly indeterminate) mode checkbox
// when the advanced panel has only partially enabled/disabled a mode's types.
export function modeCheckState(mode, enabledTypes) {
  const keys = typeKeysInCategories(mode.categories);
  const enabledCount = keys.filter((k) => enabledTypes.includes(k)).length;
  if (enabledCount === 0) return 'none';
  if (enabledCount === keys.length) return 'all';
  return 'some';
}

export const DEFAULT_ENABLED_TYPES = typeKeysInCategories(['Root', 'Triads']);

// Same 'all' | 'some' | 'none' idea as modeCheckState, for the Roots section's own
// "select all" tri-state checkbox.
export function rootsCheckState(enabledRoots) {
  if (enabledRoots.length === 0) return 'none';
  if (enabledRoots.length === ALL_ROOTS.length) return 'all';
  return 'some';
}

// Which of the four core-mode blocks a given category belongs to — used to color the
// turntable label by difficulty tier (outline → cobalt → brass → flame as chords grow
// more complex).
export function coreModeKeyForCategory(category) {
  return CORE_MODES.find((m) => m.categories.includes(category))?.key ?? 'root';
}

export function pickRandomTonalCenter(enabledKeys, enabledRoots = ALL_ROOTS) {
  const pool = ALL_TONAL_CENTER_TYPES.filter((t) => enabledKeys.includes(t.key));
  const types = pool.length > 0 ? pool : ALL_TONAL_CENTER_TYPES.filter((t) => t.key === 'root');
  const type = types[Math.floor(Math.random() * types.length)];
  // Root/triad/modal types imply an actual key — keep those to key signatures with
  // fewer than 7 sharps/flats (spelled correctly via notes.js, e.g. Bb rather than A#).
  // Symmetric scales and non-key chords (dim, aug, sevenths) aren't "in a key" at all,
  // so any of the 12 roots is fair game.
  const validRoots = type.hasKeySignature ? SIMPLE_KEY_ROOTS : ALL_ROOTS;
  // Same "don't silently produce nothing" rule as the enabledKeys fallback above: if the
  // user's root selection doesn't intersect this type's valid roots at all (e.g. every
  // enabled root needs a key signature this type can't have), fall back to the type's
  // full valid set rather than picking from an empty array.
  const filteredRoots = validRoots.filter((pc) => enabledRoots.includes(pc));
  const roots = filteredRoots.length > 0 ? filteredRoots : validRoots;
  const rootPc = roots[Math.floor(Math.random() * roots.length)];
  return { rootPc, type };
}

// Guitar mode's alternative to pickRandomTonalCenter: draws uniformly from an explicit
// {rootPc, typeKey} list (see GUITAR_OPEN_CHORD_PAIRS) instead of crossing enabledTypes
// with enabledRoots.
export function pickRandomTonalCenterFromPairs(pairs) {
  const { rootPc, typeKey } = pairs[Math.floor(Math.random() * pairs.length)];
  const type = ALL_TONAL_CENTER_TYPES.find((t) => t.key === typeKey);
  return { rootPc, type };
}

export function pickRandomDuration(minBeats, maxBeats) {
  const lo = Math.max(1, Math.min(minBeats, maxBeats));
  const hi = Math.max(minBeats, maxBeats);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
