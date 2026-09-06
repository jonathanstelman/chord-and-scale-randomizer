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

// Three broad difficulty tiers, each bundling one or more of the categories above. The
// settings UI shows just these by default; toggling one on/off enables/disables every
// type it covers, while the "Advanced" panel exposes the underlying types individually.
export const CORE_MODES = [
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

// Beginner's actual scope: major and minor triads on natural roots only — see
// docs/architecture/settings-and-presets.md for why this is a pairs list like
// GUITAR_OPEN_CHORD_PAIRS below, rather than a categories/types+roots combination.
const NATURAL_ROOT_PCS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
export const BEGINNER_TRIAD_PAIRS = NATURAL_ROOT_PCS.flatMap((rootPc) => (
  [{ rootPc, typeKey: 'maj' }, { rootPc, typeKey: 'min' }]
));

// The standard beginner "open chord" set on guitar — see
// docs/architecture/settings-and-presets.md for why this is its own explicit pair list
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

// One-click starting points layered on top of CORE_MODES — replace-vs-merge semantics
// and Guitar's special case are in docs/architecture/settings-and-presets.md. Each
// `description` is shown below the preset row while that preset is the last one applied
// (see activePresetKey in useSettings.js) — keep it a single short clause naming what's
// selected and the root scope, matching the "Randomly selected X, Y roots" pattern.
export const PRESETS = [
  {
    key: 'beginner',
    label: 'Beginner',
    pairs: BEGINNER_TRIAD_PAIRS,
    bpm: 50,
    description: 'Randomly selected major and minor chords, natural roots only',
  },
  {
    key: 'chords',
    label: 'Chords Only',
    categories: ['Triads', 'Seventh Chords'],
    description: 'Randomly selected triads and seventh chords, any root',
  },
  {
    key: 'scales',
    label: 'Scales Only',
    categories: CORE_MODES.find((m) => m.key === 'extended').categories,
    description: 'Randomly selected scale-tone chords, any root',
  },
  {
    key: 'everything',
    label: 'Everything',
    categories: CORE_MODES.flatMap((m) => m.categories),
    description: 'Randomly selected chords and scale-tone chords of every type, any root',
  },
  {
    key: 'guitar',
    label: 'Guitar',
    pairs: GUITAR_OPEN_CHORD_PAIRS,
    description: 'Randomly selected standard open-position guitar chords',
  },
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

export const DEFAULT_ENABLED_TYPES = typeKeysInCategories(['Triads']);

// Same 'all' | 'some' | 'none' idea as modeCheckState, for the Roots section's own
// "select all" tri-state checkbox.
export function rootsCheckState(enabledRoots) {
  if (enabledRoots.length === 0) return 'none';
  if (enabledRoots.length === ALL_ROOTS.length) return 'all';
  return 'some';
}

// Which of the three core-mode blocks a given category belongs to — used to color the
// turntable label by difficulty tier (cobalt → brass → flame as chords grow more
// complex).
export function coreModeKeyForCategory(category) {
  return CORE_MODES.find((m) => m.categories.includes(category))?.key ?? 'triads';
}

export function pickRandomTonalCenter(enabledKeys, enabledRoots = ALL_ROOTS) {
  const pool = ALL_TONAL_CENTER_TYPES.filter((t) => enabledKeys.includes(t.key));
  // Same "don't silently produce nothing" rule as the enabledRoots fallback below: if
  // nothing's enabled at all, fall back to the full vocabulary rather than one specific
  // type — there's no more "simplest" type (root note) to single out now that it's gone.
  const types = pool.length > 0 ? pool : ALL_TONAL_CENTER_TYPES;
  const type = types[Math.floor(Math.random() * types.length)];
  // hasKeySignature types get key-signature-valid roots, everything else can use any of
  // the 12 — see docs/architecture/music-theory.md.
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

// Pure Tone tab's "type": a single pitch, no chord/scale quality at all — see
// docs/architecture/randomizer.md's Pure Tone section for why each field is shaped this
// way.
export const PURE_TONE_TYPE = {
  key: 'pitch', label: '', intervals: [0], modeKey: 'none',
};

// Pure Tone tab's counterpart to pickRandomTonalCenter: draws a root pitch class from
// the shared roots filter with no type/quality involved. Same "don't silently produce
// nothing" fallback as pickRandomTonalCenter's root selection.
export function pickRandomRootPc(enabledRoots = ALL_ROOTS) {
  const roots = enabledRoots.length > 0 ? enabledRoots : ALL_ROOTS;
  return roots[Math.floor(Math.random() * roots.length)];
}

// Every pitch class belonging to a chosen scale, built on a chosen root — all of
// SCALE_TYPES' `degrees` (every scale tone), not the `chordIntervals` subset used to
// voice a chord. Falls back to just the root if scaleKey doesn't match anything, same
// "don't silently produce nothing" spirit as this file's other fallbacks.
export function scalePitchClasses(rootPc, scaleKey) {
  const scale = SCALE_TYPES.find((t) => t.key === scaleKey);
  const degrees = scale ? scale.degrees : [0];
  return degrees.map((d) => ((rootPc + d) % 12 + 12) % 12);
}

export function pickRandomScalePc(rootPc, scaleKey) {
  const pcs = scalePitchClasses(rootPc, scaleKey);
  return pcs[Math.floor(Math.random() * pcs.length)];
}

// Guitar mode's alternative to pickRandomTonalCenter: draws uniformly from an explicit
// {rootPc, typeKey} list (see GUITAR_OPEN_CHORD_PAIRS) instead of crossing enabledTypes
// with enabledRoots.
export function pickRandomTonalCenterFromPairs(pairs) {
  const { rootPc, typeKey } = pairs[Math.floor(Math.random() * pairs.length)];
  const type = ALL_TONAL_CENTER_TYPES.find((t) => t.key === typeKey);
  return { rootPc, type };
}

// "Ordered" custom-bank mode's counterpart to pickRandomTonalCenterFromPairs: walks a
// {rootPc, typeKey} list in the order it was written rather than drawing randomly. Wraps
// via modulo, so it stays correct even if the bank was edited (and thus shorter) since
// the caller's cursor was last incremented.
export function tonalCenterAtIndex(pairs, index) {
  const { rootPc, typeKey } = pairs[((index % pairs.length) + pairs.length) % pairs.length];
  const type = ALL_TONAL_CENTER_TYPES.find((t) => t.key === typeKey);
  return { rootPc, type };
}

export function pickRandomDuration(minBeats, maxBeats) {
  const lo = Math.max(1, Math.min(minBeats, maxBeats));
  const hi = Math.max(minBeats, maxBeats);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
