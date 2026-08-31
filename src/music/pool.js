import { CHORD_QUALITIES } from './chordQualities';
import { SCALE_TYPES } from './scaleFamilies';
import { pitchClassAccidentals } from './notes';

// "Fewer than 7 sharps or flats" — beyond this a key signature isn't really used in
// practice (the standard 12 major keys top out at 6, for F#/Gb).
const MAX_KEY_SIGNATURE_ACCIDENTALS = 6;
const ALL_ROOTS = Array.from({ length: 12 }, (_, pc) => pc);
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

// Which of the four core-mode blocks a given category belongs to — used to color the
// turntable label by difficulty tier (outline → cobalt → brass → flame as chords grow
// more complex).
export function coreModeKeyForCategory(category) {
  return CORE_MODES.find((m) => m.categories.includes(category))?.key ?? 'root';
}

export function pickRandomTonalCenter(enabledKeys) {
  const pool = ALL_TONAL_CENTER_TYPES.filter((t) => enabledKeys.includes(t.key));
  const types = pool.length > 0 ? pool : ALL_TONAL_CENTER_TYPES.filter((t) => t.key === 'root');
  const type = types[Math.floor(Math.random() * types.length)];
  // Root/triad/modal types imply an actual key — keep those to key signatures with
  // fewer than 7 sharps/flats (spelled correctly via notes.js, e.g. Bb rather than A#).
  // Symmetric scales and non-key chords (dim, aug, sevenths) aren't "in a key" at all,
  // so any of the 12 roots is fair game.
  const roots = type.hasKeySignature ? SIMPLE_KEY_ROOTS : ALL_ROOTS;
  const rootPc = roots[Math.floor(Math.random() * roots.length)];
  return { rootPc, type };
}

export function pickRandomDuration(minBeats, maxBeats) {
  const lo = Math.max(1, Math.min(minBeats, maxBeats));
  const hi = Math.max(minBeats, maxBeats);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
