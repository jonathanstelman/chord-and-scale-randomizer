// Scale Degrees tab (issue #8): everything that turns "a pitch class against a drone's
// tonic" into a labeled scale degree, plus the drone and target note names. Pure — no
// React, no Tone.js — like the rest of src/music/.
//
// Contract only: every function here is a stub until issue #51 lands. The signatures and
// return shapes are the agreed interface the engine (#52), settings UI (#53) and
// integration (#54) streams build against, so change them there first, not here.

// Offsets of the major scale's seven degrees — the reference every accidental is
// measured from, so Locrian's fifth tone reads ♭5 and Lydian's fourth reads ♯4.
export const MAJOR_DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

// Spelling for a pitch the chosen scale can't spell itself: an out-of-scale pc in
// Chromatic mode, or any pc of a non-heptatonic scale. Indexed by semitones above the
// tonic. The one sharp is ♯4 — see docs/architecture/music-theory.md once #51 lands.
export const FALLBACK_DEGREE_LABELS = [
  { number: 1, accidental: 0 }, { number: 2, accidental: -1 }, { number: 2, accidental: 0 },
  { number: 3, accidental: -1 }, { number: 3, accidental: 0 }, { number: 4, accidental: 0 },
  { number: 4, accidental: 1 }, { number: 5, accidental: 0 }, { number: 6, accidental: -1 },
  { number: 6, accidental: 0 }, { number: 7, accidental: -1 }, { number: 7, accidental: 0 },
];

// Typeless segment type for this tab, PURE_TONE_TYPE's sibling: intervals [0] so the
// voicing path degenerates to one note, empty label so tonalCenterPhrase falls back to
// the degree text.
export const SCALE_DEGREE_TYPE = {
  key: 'degree', label: '', intervals: [0],
};

const DRONE_OCTAVE = 3; // tonic sounds here; targets sit in the octave above
export const TARGET_OCTAVE = DRONE_OCTAVE + 1;

function notImplemented(name) {
  throw new Error(`scaleDegrees.${name} is not implemented yet (issue #51)`);
}

// (pc, rootPc, scaleKey) → { number: 1-7, accidental: -2..2 } where accidental is
// semitones relative to the major scale's degree of the same number (𝄫 ♭ ♮ ♯ 𝄪).
export function degreeLabel(_pc, _rootPc, _scaleKey) {
  notImplemented('degreeLabel');
}

// ({ number, accidental }, 'numbers' | 'solfege') → display text: '♭3' or 'me'. Solfège
// is do-based for every scale; a double alteration has no standard syllable and renders
// numerically in either style.
export function formatDegree(_label, _style) {
  notImplemented('formatDegree');
}

// (rootPc, scaleKey, 'diatonic' | 'chromatic') → pitch classes the target may be drawn
// from. Diatonic is scalePitchClasses (pool.js); chromatic is all twelve.
export function scaleDegreePool(_rootPc, _scaleKey, _pool) {
  notImplemented('scaleDegreePool');
}

// (rootPc, scaleKey, 'tonic' | 'fifth' | 'chord') → note names for the drone, in
// DRONE_OCTAVE. 'chord' is the root/3rd/5th of the scale type's chordIntervals.
export function droneNotes(_rootPc, _scaleKey, _kind) {
  notImplemented('droneNotes');
}

// (pc, rootPc) → the target's note name: the pc's interval above the tonic, one octave
// up from the drone, so degree 1 is the octave, never a unison with the drone.
export function targetNoteName(_pc, _rootPc) {
  notImplemented('targetNoteName');
}
