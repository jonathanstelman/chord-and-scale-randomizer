import { SCALE_TYPES } from './scaleFamilies';
import { NATURAL_PITCH_CLASS, pitchClassToName, pitchClassToNoteName } from './notes';

// Scale Degrees tab: everything that turns "a pitch class against a drone's tonic" into a
// labeled scale degree, plus the drone and target note names. Pure — no React, no
// Tone.js — like the rest of src/music/. The spelling rule and why it's shaped this way
// are in docs/architecture/music-theory.md's "Scale-degree spelling" section.

// Offsets of the major scale's seven degrees — the reference every accidental is
// measured from, so Locrian's fifth tone reads ♭5 and Lydian's fourth reads ♯4.
export const MAJOR_DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

// Spelling for a pitch the chosen scale can't spell itself: an out-of-scale pc in
// Chromatic mode, or any pc of a non-heptatonic scale. Indexed by semitones above the
// tonic. The one sharp is ♯4 — see docs/architecture/music-theory.md.
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

// Chromatic mode has no scale: every pitch is spelled major-relative (which is exactly
// the fallback table), and the tonic chord is the major triad. Routing it through
// Ionian rather than a null key keeps that one fact in one place — see
// docs/architecture/randomizer.md's Scale Degrees section for why Scale hides.
export function scaleDegreesKey(s) {
  return s.scaleDegreesPool === 'chromatic' ? 'diatonic:Ionian' : s.scaleDegreesScaleKey;
}

const DRONE_OCTAVE = 3; // tonic sounds here; targets sit in the octave above
export const TARGET_OCTAVE = DRONE_OCTAVE + 1;

const HEPTATONIC = 7;

// 0 maps to '' on purpose — naturals never carry a ♮ (docs/architecture/music-theory.md).
const ACCIDENTAL_GLYPHS = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };

// Do-based syllables keyed "number:accidental". Anything absent (𝄫/𝄪, ♭1, ♭4, ♯3, ♯7)
// has no standard syllable and renders numerically instead.
const SOLFEGE = {
  '1:0': 'do', '2:0': 're', '3:0': 'mi', '4:0': 'fa', '5:0': 'sol', '6:0': 'la', '7:0': 'ti',
  '2:-1': 'ra', '3:-1': 'me', '5:-1': 'se', '6:-1': 'le', '7:-1': 'te',
  '1:1': 'di', '2:1': 'ri', '4:1': 'fi', '5:1': 'si', '6:1': 'li',
};

const CHROMATIC_PCS = Array.from({ length: 12 }, (_, pc) => pc);

function intervalAbove(rootPc, pc) {
  return ((pc - rootPc) % 12 + 12) % 12;
}

function findScale(scaleKey) {
  return SCALE_TYPES.find((t) => t.key === scaleKey);
}

// Note name `semitones` above a tonic sounding in `octave`, carrying into the next octave
// when the pitch class wraps past B — a fifth above B3 is F#4, not F#3.
function noteAbove(rootPc, semitones, octave) {
  const absolute = ((rootPc % 12) + 12) % 12 + semitones;
  return pitchClassToNoteName(absolute % 12, octave + Math.floor(absolute / 12));
}

// (pc, rootPc, scaleKey) → { number: 1-7, accidental: -2..2 } where accidental is
// semitones relative to the major scale's degree of the same number (𝄫 ♭ none ♯ 𝄪).
export function degreeLabel(pc, rootPc, scaleKey) {
  const interval = intervalAbove(rootPc, pc);
  const scale = findScale(scaleKey);
  if (scale && scale.degrees.length === HEPTATONIC) {
    const k = scale.degrees.indexOf(interval);
    if (k !== -1) return { number: k + 1, accidental: interval - MAJOR_DEGREE_OFFSETS[k] };
  }
  return FALLBACK_DEGREE_LABELS[interval];
}

// ({ number, accidental }, 'numbers' | 'solfege') → display text: '♭3' or 'me'. Solfège
// is do-based for every scale; a double alteration has no standard syllable and renders
// numerically in either style.
export function formatDegree(label, style) {
  const { number, accidental } = label;
  if (style === 'solfege') {
    const syllable = SOLFEGE[`${number}:${accidental}`];
    if (syllable) return syllable;
  }
  return `${ACCIDENTAL_GLYPHS[accidental]}${number}`;
}

// (rootPc, scaleKey, 'diatonic' | 'chromatic') → pitch classes the target may be drawn
// from. Diatonic mirrors pool.js's scalePitchClasses (every scale tone, root alone for an
// unknown key) rather than importing it: pool.js imports formatDegree from here for
// tonalCenterPhrase, and the cycle isn't worth three lines.
export function scaleDegreePool(rootPc, scaleKey, pool) {
  if (pool === 'chromatic') return [...CHROMATIC_PCS];
  const scale = findScale(scaleKey);
  return (scale ? scale.degrees : [0]).map((d) => intervalAbove(0, rootPc + d));
}

// (rootPc, scaleKey, 'tonic' | 'fifth' | 'chord') → note names for the drone, in
// DRONE_OCTAVE. 'chord' is the root/3rd/5th of the scale type's chordIntervals, falling
// back to the tonic alone for an unrecognized scaleKey (same spirit as scalePitchClasses).
export function droneNotes(rootPc, scaleKey, kind) {
  let intervals = [0];
  if (kind === 'fifth') intervals = [0, 7];
  if (kind === 'chord') {
    const scale = findScale(scaleKey);
    if (scale) intervals = scale.chordIntervals.slice(0, 3);
  }
  return intervals.map((semitones) => noteAbove(rootPc, semitones, DRONE_OCTAVE));
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// (label, pc, rootPc) → the target's *display* name spelled by its degree, so the 7th of
// E major is D♯, not the key-blind E♭ pitchClassToDisplayName would give. The degree
// number fixes the letter (tonic letter + number − 1); the pitch class fixes the
// accidental. See docs/architecture/music-theory.md's "Registers" note.
export function degreeNoteName(label, pc, rootPc) {
  const tonicLetter = pitchClassToName(rootPc)[0];
  const letter = LETTERS[(LETTERS.indexOf(tonicLetter) + label.number - 1) % 7];
  const offset = ((pc - NATURAL_PITCH_CLASS[letter]) % 12 + 18) % 12 - 6; // -6..5
  return `${letter}${ACCIDENTAL_GLYPHS[offset] ?? ''}`;
}

// (pc, rootPc) → the target's note name: the pc's interval above the tonic, one octave
// up from the drone, so degree 1 is the octave, never a unison with the drone.
export function targetNoteName(pc, rootPc) {
  return noteAbove(rootPc, intervalAbove(rootPc, pc), TARGET_OCTAVE);
}
