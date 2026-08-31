import { pitchClassToNoteName } from './notes';

// Turn a root pitch class + semitone offsets (in tertian stacking order: root, 3rd, 5th,
// 7th, 9th, ...) into a clear voicing: the root sits alone in a low octave, everything
// else stacks upward starting an octave above it (spilling into the next octave only
// when needed to keep climbing). `maxNotes` caps density — since intervals arrive in
// stacking order, truncating keeps the notes that define the chord and drops the
// tallest, least-essential extensions first.
export function voiceChord(rootPc, intervals, options = {}) {
  const { rootOctave = 3, upperOctave = 4, maxNotes = 5 } = options;
  const capped = intervals.slice(0, Math.max(1, maxNotes));
  const [rootOffset, ...upperOffsets] = capped;

  const toNote = (pc, octave) => ({ pc, octave, noteName: pitchClassToNoteName(pc, octave) });
  const wrap = (n) => ((n % 12) + 12) % 12;

  const notes = [toNote(wrap(rootPc + rootOffset), rootOctave)];

  let prevAbs = upperOctave * 12 - 1;
  for (const offset of upperOffsets) {
    let abs = upperOctave * 12 + wrap(rootPc + offset);
    while (abs <= prevAbs) abs += 12;
    prevAbs = abs;
    notes.push(toNote(wrap(abs), Math.floor(abs / 12)));
  }
  return notes;
}

// Simple, beat-friendly arpeggio-pattern lengths: each one divides evenly into 8 (32nd
// notes per beat), so a fixed 32nd-note arpeggiator always re-locks to the downbeat
// every 1, 2, 4, or 8 notes — a 3-note triad instead drifts a third of a beat out of
// phase with the click on every cycle (a "triplet over 4" feel).
const SIMPLE_ARPEGGIO_LENGTHS = [1, 2, 4, 8];

// Pads a voiced chord up to the next simple length by octave-doubling notes from the
// bottom of the chord (root first, then 3rd, ...) — e.g. a triad (root-3rd-5th) becomes
// root-3rd-5th-root⁺⁸ᵛᵃ, a classic "1-3-5-8" broken-chord extension. Chords that already
// land on 1, 2, 4, or 8 notes (a root, a seventh chord, a max-density scale chord) are
// returned unchanged.
export function padToSimpleArpeggioLength(voicedNotes) {
  const target = SIMPLE_ARPEGGIO_LENGTHS.find((len) => len >= voicedNotes.length) ?? 8;
  const noteNames = voicedNotes.map((v) => v.noteName);
  for (let i = 0; noteNames.length < target; i++) {
    const source = voicedNotes[i % voicedNotes.length];
    noteNames.push(pitchClassToNoteName(source.pc, source.octave + 1));
  }
  return noteNames;
}
