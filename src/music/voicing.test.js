import { describe, it, expect } from 'vitest';
import { voiceChord, padToSimpleArpeggioLength } from './voicing';

describe('voiceChord', () => {
  it('puts the root alone in the low octave and stacks the rest ascending above it', () => {
    // C major triad: root, 3rd, 5th.
    const notes = voiceChord(0, [0, 4, 7]);
    expect(notes.map((n) => n.noteName)).toEqual(['C3', 'E4', 'G4']);
  });

  it('bumps an upper note into the next octave when its raw pitch class would land at or below the previous note', () => {
    // A synthetic 9th-chord stack (root, 3rd, 5th, 7th, 9th) where the 9th (offset 14,
    // pitch class 2) would otherwise land below the 7th (pitch class 11) in the same
    // octave — it must climb into the next one instead of sounding lower than the note
    // before it.
    const notes = voiceChord(0, [0, 4, 7, 11, 14]);
    expect(notes.map((n) => n.noteName)).toEqual(['C3', 'E4', 'G4', 'B4', 'D5']);
    // Each upper note must be strictly higher (in absolute pitch) than the one before it.
    const abs = notes.map((n) => n.octave * 12 + n.pc);
    for (let i = 2; i < abs.length; i++) {
      expect(abs[i]).toBeGreaterThan(abs[i - 1]);
    }
  });

  it('truncates to maxNotes, keeping the lowest (most essential) intervals', () => {
    const notes = voiceChord(0, [0, 4, 7, 11, 14], { maxNotes: 3 });
    expect(notes.map((n) => n.noteName)).toEqual(['C3', 'E4', 'G4']);
  });

  it('respects a non-default rootOctave/upperOctave', () => {
    const notes = voiceChord(7, [0, 3, 7], { rootOctave: 2, upperOctave: 5 });
    expect(notes.map((n) => n.noteName)).toEqual(['G2', 'Bb5', 'D6']);
  });

  it('never produces fewer than one note even if maxNotes is 0', () => {
    const notes = voiceChord(0, [0, 4, 7], { maxNotes: 0 });
    expect(notes).toHaveLength(1);
  });
});

describe('padToSimpleArpeggioLength', () => {
  it('leaves a chord already at a simple length unchanged', () => {
    // Maj7 voicing: root-3rd-5th-7th, already 4 notes.
    const voiced = voiceChord(0, [0, 4, 7, 11]);
    expect(padToSimpleArpeggioLength(voiced)).toEqual(['C3', 'E4', 'G4', 'B4']);
  });

  it('leaves a single root note unchanged', () => {
    const voiced = voiceChord(0, [0]);
    expect(padToSimpleArpeggioLength(voiced)).toEqual(['C3']);
  });

  it('pads a triad (3 notes) up to 4 with an octave-doubled root ("1-3-5-8")', () => {
    const voiced = voiceChord(0, [0, 4, 7]);
    expect(padToSimpleArpeggioLength(voiced)).toEqual(['C3', 'E4', 'G4', 'C4']);
  });

  it('pads a 5-note chord up to 8 by cycling back through the chord from the bottom', () => {
    const voiced = voiceChord(0, [0, 4, 7, 11, 14]);
    expect(padToSimpleArpeggioLength(voiced)).toEqual([
      'C3', 'E4', 'G4', 'B4', 'D5', 'C4', 'E5', 'G5',
    ]);
  });
});
