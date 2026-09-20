import { NATURAL_PITCH_CLASS, pitchClassToDisplayName } from './notes';
import { PARENT_SCALE_DEGREES, SCALE_TYPES } from './scaleFamilies';

// How a root is *named* on screen: by the key it's in. A pitch class has no spelling of
// its own — C♯ and D♭ are the same key on the piano — so the thing built on it decides:
// D♭ Major but C♯ Minor, C♯ Dorian (from B major) but G♭ Lydian (from D♭ major). The
// full rule, and the cases it deliberately doesn't cover, are in
// docs/architecture/music-theory.md's "Root spelling". No React, no Tone.js; the one
// impure function is the keyless random pick, and it says so.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const GLYPH = { '-1': '♭', 0: '', 1: '♯' };

// Never shown as a root: a key nobody has heard of, and jazz names these modes for the
// chord they're played over (F Altered, not E♯ Altered).
const UNSPELLABLE_ROOTS = new Set(['E♯', 'B♯', 'F♭', 'C♭']);

// The two names a black key has when nothing decides between them.
const ENHARMONIC_PAIRS = {
  1: ['C♯', 'D♭'], 3: ['D♯', 'E♭'], 6: ['F♯', 'G♭'], 8: ['G♯', 'A♭'], 10: ['A♯', 'B♭'],
};

const pcMod = (n) => ((n % 12) + 12) % 12;

// Spell `pc` as the `degree`-th letter (1-based) above `tonicLetter`, or null when that
// takes a double accidental or lands on an unspellable root — the caller falls back.
export function spellAsDegreeOf(tonicLetter, degree, pc) {
  const letter = LETTERS[(LETTERS.indexOf(tonicLetter) + degree - 1) % 7];
  const offset = ((pc - NATURAL_PITCH_CLASS[letter]) % 12 + 18) % 12 - 6;
  if (Math.abs(offset) > 1) return null;
  const name = `${letter}${GLYPH[offset]}`;
  return UNSPELLABLE_ROOTS.has(name) ? null : name;
}

// The major-key spelling is notes.js's table: fewest accidentals as a major tonic.
export function majorKeyName(pc) {
  return pitchClassToDisplayName(pc);
}

// A minor tonic is the 6th degree of its relative major, so it inherits that key's
// spelling: C♯ Minor from E major, G♯ Minor from B major.
export function minorKeyName(pc) {
  const relativeMajor = majorKeyName(pcMod(pc + 3));
  return spellAsDegreeOf(relativeMajor[0], 6, pc) ?? majorKeyName(pc);
}

// A pitch with no key to decide its name — a bare pitch, a symmetric scale's root —
// takes one of its two names at random, per pick. Not both: it looked awkward, and
// meeting C♯ and D♭ as two separate things is the practice a lead sheet demands.
export function randomEnharmonicName(pc) {
  const pair = ENHARMONIC_PAIRS[pcMod(pc)];
  return pair ? pair[Math.floor(Math.random() * 2)] : majorKeyName(pc);
}

// A picker's label names a pitch *class*, not a pitch in a key, and a label can't
// re-roll on every render — so pickers use the one fixed spelling notes.js has always
// used, and the display re-spells by context once something is built on it.
export function pitchClassName(pc) {
  return majorKeyName(pc);
}

// A mode's root is the degreeIndex-th degree of its parent scale, so find the parent
// tonic, spell *it* by its key (major for the diatonic modes, minor for the melodic- and
// harmonic-minor modes), and read the root off that letter.
function modeRootName(pc, type) {
  const parentDegrees = PARENT_SCALE_DEGREES[type.family];
  const parentPc = pcMod(pc - parentDegrees[type.degreeIndex - 1]);
  const parentName = type.family === 'diatonic' ? majorKeyName(parentPc) : minorKeyName(parentPc);
  return spellAsDegreeOf(parentName[0], type.degreeIndex, pc) ?? majorKeyName(pc);
}

// (pc, type) → the root's display name for a tonal center of that type. `type` is any
// object with a `spelling` field (CHORD_QUALITIES, SCALE_TYPES, ALL_TONAL_CENTER_TYPES,
// PURE_TONE_TYPE); no type at all means a bare pitch. The keyless case is random, so
// call this once per pick and keep the result on the segment, never per render.
export function spellRoot(pc, type) {
  switch (type?.spelling) {
    case 'major': return majorKeyName(pc);
    case 'minor': return minorKeyName(pc);
    case 'mode': return modeRootName(pc, type);
    default: return randomEnharmonicName(pc);
  }
}

// The tonic of a key defined by a scale type — the Scale Degrees drone, Pure Tone's Scale
// mode. A mode spells by the mode rule; anything without a key (a symmetric scale, an
// unknown key, Chromatic) takes the major-key spelling, since its degrees are labeled
// major-relative anyway and a one-name tonic is what the degree letters are read from.
export function spellScaleTonic(pc, scaleKey) {
  const type = SCALE_TYPES.find((t) => t.key === scaleKey);
  return type?.spelling === 'mode' ? modeRootName(pc, type) : majorKeyName(pc);
}

// "C♯"/"Db"/"c#" as a user typed it → the same root in the app's glyphs, spelling kept.
export function typedRootName(letter, accidental) {
  const glyph = accidental === '#' || accidental === '♯' ? '♯'
    : accidental === 'b' || accidental === '♭' ? '♭' : '';
  return `${letter.toUpperCase()}${glyph}`;
}
