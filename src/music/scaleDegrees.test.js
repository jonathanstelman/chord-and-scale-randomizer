import { describe, it, expect } from 'vitest';
import {
  MAJOR_DEGREE_OFFSETS,
  FALLBACK_DEGREE_LABELS,
  SCALE_DEGREE_TYPE,
  TARGET_OCTAVE,
  degreeLabel,
  formatDegree,
  scaleDegreePool,
  degreeNoteName,
  droneNotes,
  targetNoteName,
} from './scaleDegrees';
import { SCALE_TYPES } from './scaleFamilies';
import { ALL_ROOTS, PURE_TONE_TYPE, scalePitchClasses } from './pool';

const ALL_PCS = Array.from({ length: 12 }, (_, pc) => pc);

// The whole scale's labels in ascending order, as the display would show them — the
// most readable way to pin a mode's spelling.
function spell(rootPc, scaleKey, style = 'numbers') {
  return scalePitchClasses(rootPc, scaleKey)
    .map((pc) => formatDegree(degreeLabel(pc, rootPc, scaleKey), style))
    .join(' ');
}

function spellChromatic(rootPc, scaleKey, style = 'numbers') {
  return ALL_PCS
    .map((pc) => formatDegree(degreeLabel((rootPc + pc) % 12, rootPc, scaleKey), style))
    .join(' ');
}

describe('MAJOR_DEGREE_OFFSETS', () => {
  it('is the Ionian step pattern from scaleFamilies, so the two can never disagree', () => {
    expect(MAJOR_DEGREE_OFFSETS).toEqual(SCALE_TYPES.find((t) => t.key === 'diatonic:Ionian').degrees);
  });
});

describe('FALLBACK_DEGREE_LABELS', () => {
  it('spells the chromatic octave with ♯4 as the only sharp', () => {
    expect(FALLBACK_DEGREE_LABELS.map((l) => formatDegree(l, 'numbers')).join(' '))
      .toBe('1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7');
  });
});

describe('SCALE_DEGREE_TYPE', () => {
  it("has PURE_TONE_TYPE's typeless shape under its own key", () => {
    expect(SCALE_DEGREE_TYPE.intervals).toEqual(PURE_TONE_TYPE.intervals);
    expect(SCALE_DEGREE_TYPE.label).toBe('');
    expect(SCALE_DEGREE_TYPE.key).not.toBe(PURE_TONE_TYPE.key);
  });
});

describe('degreeLabel', () => {
  it('reproduces every diatonic mode name from its spelling', () => {
    expect(spell(0, 'diatonic:Ionian')).toBe('1 2 3 4 5 6 7');
    expect(spell(0, 'diatonic:Dorian')).toBe('1 2 ♭3 4 5 6 ♭7');
    expect(spell(0, 'diatonic:Phrygian')).toBe('1 ♭2 ♭3 4 5 ♭6 ♭7');
    expect(spell(0, 'diatonic:Lydian')).toBe('1 2 3 ♯4 5 6 7');
    expect(spell(0, 'diatonic:Mixolydian')).toBe('1 2 3 4 5 6 ♭7');
    expect(spell(0, 'diatonic:Aeolian')).toBe('1 2 ♭3 4 5 ♭6 ♭7');
    expect(spell(0, 'diatonic:Locrian')).toBe('1 ♭2 ♭3 4 ♭5 ♭6 ♭7');
  });

  it('reproduces the melodic and harmonic minor mode names, double flat included', () => {
    expect(spell(0, 'melodicMinor:Lydian Augmented')).toBe('1 2 3 ♯4 ♯5 6 7');
    expect(spell(0, 'melodicMinor:Locrian ♮2')).toBe('1 2 ♭3 4 ♭5 ♭6 ♭7');
    expect(spell(0, 'melodicMinor:Altered')).toBe('1 ♭2 ♭3 ♭4 ♭5 ♭6 ♭7');
    expect(spell(0, 'harmonicMinor:Harmonic Minor')).toBe('1 2 ♭3 4 5 ♭6 7');
    expect(spell(0, 'harmonicMinor:Lydian ♯2')).toBe('1 ♯2 3 ♯4 5 6 7');
    expect(spell(0, 'harmonicMinor:Super Locrian 𝄫7')).toBe('1 ♭2 ♭3 ♭4 ♭5 ♭6 𝄫7');
  });

  it('returns the raw { number, accidental } shape', () => {
    expect(degreeLabel(6, 0, 'diatonic:Locrian')).toEqual({ number: 5, accidental: -1 });
    expect(degreeLabel(6, 0, 'diatonic:Lydian')).toEqual({ number: 4, accidental: 1 });
    expect(degreeLabel(9, 0, 'harmonicMinor:Super Locrian 𝄫7')).toEqual({ number: 7, accidental: -2 });
  });

  it('labels relative to the root, not to C', () => {
    // E Phrygian: F is ♭2, D is ♭7
    expect(degreeLabel(5, 4, 'diatonic:Phrygian')).toEqual({ number: 2, accidental: -1 });
    expect(degreeLabel(2, 4, 'diatonic:Phrygian')).toEqual({ number: 7, accidental: -1 });
    // F Lydian: B is ♯4
    expect(degreeLabel(11, 5, 'diatonic:Lydian')).toEqual({ number: 4, accidental: 1 });
  });

  it('gives every heptatonic scale each number 1-7 exactly once, within 𝄫..𝄪', () => {
    for (const scale of SCALE_TYPES.filter((t) => t.degrees.length === 7)) {
      const labels = scalePitchClasses(0, scale.key).map((pc) => degreeLabel(pc, 0, scale.key));
      expect(labels.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      for (const { accidental } of labels) {
        expect(accidental).toBeGreaterThanOrEqual(-2);
        expect(accidental).toBeLessThanOrEqual(2);
      }
    }
  });

  it('falls back to the fixed chromatic spelling for out-of-scale pcs in C major', () => {
    expect(spellChromatic(0, 'diatonic:Ionian')).toBe('1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7');
  });

  it('mixes the scale spelling for scale tones with the fallback for the rest', () => {
    // Locrian owns the 6th semitone as ♭5; the out-of-scale 7th semitone reads 5 from the
    // fallback. Lydian is the mirror image: ♯4 in scale, a plain 4 from the fallback.
    expect(spellChromatic(0, 'diatonic:Locrian')).toBe('1 ♭2 2 ♭3 3 4 ♭5 5 ♭6 6 ♭7 7');
    expect(spellChromatic(0, 'diatonic:Lydian')).toBe('1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7');
    expect(spellChromatic(0, 'harmonicMinor:Lydian ♯2')).toBe('1 ♭2 2 ♯2 3 4 ♯4 5 ♭6 6 ♭7 7');
  });

  it('never gives two pitch classes the same label, for any scale on any root', () => {
    for (const scale of SCALE_TYPES) {
      for (const rootPc of ALL_ROOTS) {
        const labels = ALL_PCS.map((pc) => formatDegree(degreeLabel(pc, rootPc, scale.key), 'numbers'));
        expect(new Set(labels).size).toBe(12);
      }
    }
  });

  it('uses the fallback throughout for whole tone and both diminished scales', () => {
    for (const key of ['symmetric:Whole Tone', 'symmetric:Diminished (W-H)', 'symmetric:Diminished (H-W)']) {
      for (const rootPc of [0, 4, 11]) {
        for (const pc of ALL_PCS) {
          const interval = ((pc - rootPc) % 12 + 12) % 12;
          expect(degreeLabel(pc, rootPc, key)).toEqual(FALLBACK_DEGREE_LABELS[interval]);
        }
      }
    }
  });

  it('uses the fallback for an unrecognized scale key', () => {
    expect(spellChromatic(0, 'not-a-real-scale')).toBe('1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7');
  });
});

describe('formatDegree', () => {
  it('renders numbers with real accidental glyphs and no ♮ on naturals', () => {
    expect(formatDegree({ number: 1, accidental: 0 }, 'numbers')).toBe('1');
    expect(formatDegree({ number: 3, accidental: -1 }, 'numbers')).toBe('♭3');
    expect(formatDegree({ number: 4, accidental: 1 }, 'numbers')).toBe('♯4');
    expect(formatDegree({ number: 7, accidental: -2 }, 'numbers')).toBe('𝄫7');
    expect(formatDegree({ number: 2, accidental: 2 }, 'numbers')).toBe('𝄪2');
  });

  it('renders do-based solfège for naturals, flats and sharps', () => {
    expect(spellChromatic(0, 'diatonic:Ionian', 'solfege'))
      .toBe('do ra re me mi fa fi sol le la te ti');
    expect(formatDegree({ number: 1, accidental: 1 }, 'solfege')).toBe('di');
    expect(formatDegree({ number: 2, accidental: 1 }, 'solfege')).toBe('ri');
    expect(formatDegree({ number: 4, accidental: 1 }, 'solfege')).toBe('fi');
    expect(formatDegree({ number: 5, accidental: 1 }, 'solfege')).toBe('si');
    expect(formatDegree({ number: 6, accidental: 1 }, 'solfege')).toBe('li');
    expect(formatDegree({ number: 5, accidental: -1 }, 'solfege')).toBe('se');
  });

  it('stays do-based in every mode rather than switching to la-based minor', () => {
    expect(spell(0, 'diatonic:Aeolian', 'solfege')).toBe('do re me fa sol le te');
    expect(spell(0, 'diatonic:Locrian', 'solfege')).toBe('do ra me fa se le te');
    expect(spell(0, 'melodicMinor:Lydian Augmented', 'solfege')).toBe('do re mi fi si la ti');
  });

  it('falls back to the numeric rendering when a label has no syllable', () => {
    expect(formatDegree({ number: 7, accidental: -2 }, 'solfege')).toBe('𝄫7');
    expect(formatDegree({ number: 2, accidental: 2 }, 'solfege')).toBe('𝄪2');
    expect(formatDegree({ number: 1, accidental: -1 }, 'solfege')).toBe('♭1');
    expect(formatDegree({ number: 4, accidental: -1 }, 'solfege')).toBe('♭4');
    expect(formatDegree({ number: 3, accidental: 1 }, 'solfege')).toBe('♯3');
    expect(formatDegree({ number: 7, accidental: 1 }, 'solfege')).toBe('♯7');
    // ...so a scale with such a degree comes out mixed, by design
    expect(spell(0, 'harmonicMinor:Super Locrian 𝄫7', 'solfege')).toBe('do ra me ♭4 se le 𝄫7');
  });
});

describe('scaleDegreePool', () => {
  it('is the scale itself for the diatonic pool', () => {
    expect(scaleDegreePool(0, 'diatonic:Ionian', 'diatonic')).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(scaleDegreePool(7, 'diatonic:Dorian', 'diatonic')).toEqual(scalePitchClasses(7, 'diatonic:Dorian'));
  });

  it('is all twelve pitch classes for the chromatic pool, whatever the scale', () => {
    expect(scaleDegreePool(0, 'diatonic:Ionian', 'chromatic')).toEqual(ALL_PCS);
    expect(scaleDegreePool(9, 'symmetric:Whole Tone', 'chromatic')).toEqual(ALL_PCS);
  });

  it('hands out a fresh array each time, so a caller can mutate it safely', () => {
    const a = scaleDegreePool(0, 'diatonic:Ionian', 'chromatic');
    a.pop();
    expect(scaleDegreePool(0, 'diatonic:Ionian', 'chromatic')).toHaveLength(12);
  });
});

describe('droneNotes', () => {
  it('puts the tonic in octave 3', () => {
    expect(droneNotes(0, 'diatonic:Ionian', 'tonic')).toEqual(['C3']);
    expect(droneNotes(11, 'diatonic:Ionian', 'tonic')).toEqual(['B3']);
  });

  it('adds a perfect fifth above the tonic', () => {
    expect(droneNotes(0, 'diatonic:Ionian', 'fifth')).toEqual(['C3', 'G3']);
    expect(droneNotes(2, 'diatonic:Locrian', 'fifth')).toEqual(['D3', 'A3']);
  });

  it('carries into octave 4 rather than wrapping down when the fifth passes B', () => {
    expect(droneNotes(11, 'diatonic:Ionian', 'fifth')).toEqual(['B3', 'F#4']);
    expect(droneNotes(7, 'diatonic:Ionian', 'fifth')).toEqual(['G3', 'D4']);
  });

  it("voices the scale's I chord as root, 3rd and 5th", () => {
    expect(droneNotes(0, 'diatonic:Ionian', 'chord')).toEqual(['C3', 'E3', 'G3']);
    expect(droneNotes(0, 'diatonic:Aeolian', 'chord')).toEqual(['C3', 'Eb3', 'G3']);
    expect(droneNotes(0, 'diatonic:Locrian', 'chord')).toEqual(['C3', 'Eb3', 'F#3']);
    expect(droneNotes(0, 'melodicMinor:Lydian Augmented', 'chord')).toEqual(['C3', 'E3', 'Ab3']);
    expect(droneNotes(0, 'symmetric:Whole Tone', 'chord')).toEqual(['C3', 'E3', 'Ab3']);
    expect(droneNotes(0, 'symmetric:Diminished (W-H)', 'chord')).toEqual(['C3', 'Eb3', 'F#3']);
  });

  it('carries chord tones past B into octave 4 too', () => {
    expect(droneNotes(7, 'diatonic:Ionian', 'chord')).toEqual(['G3', 'B3', 'D4']);
    expect(droneNotes(11, 'diatonic:Aeolian', 'chord')).toEqual(['B3', 'D4', 'F#4']);
  });

  it('falls back to the bare tonic for a chord on an unrecognized scale key', () => {
    expect(droneNotes(0, 'not-a-real-scale', 'chord')).toEqual(['C3']);
  });
});

describe('targetNoteName', () => {
  it('puts the tonic one octave above the drone, so degree 1 is never a unison', () => {
    for (const rootPc of ALL_ROOTS) {
      const [drone] = droneNotes(rootPc, 'diatonic:Ionian', 'tonic');
      expect(targetNoteName(rootPc, rootPc)).toBe(drone.replace(/3$/, String(TARGET_OCTAVE)));
    }
  });

  it('keeps a C drone\'s targets inside octave 4', () => {
    expect(targetNoteName(0, 0)).toBe('C4');
    expect(targetNoteName(6, 0)).toBe('F#4');
    expect(targetNoteName(11, 0)).toBe('B4');
  });

  it('runs a B drone\'s targets from B4 up through Bb5, never wrapping back down', () => {
    expect(targetNoteName(11, 11)).toBe('B4');
    expect(targetNoteName(0, 11)).toBe('C5');
    expect(targetNoteName(6, 11)).toBe('F#5');
    expect(targetNoteName(10, 11)).toBe('Bb5');
  });

  it('measures the interval from the root, not from C', () => {
    expect(targetNoteName(7, 7)).toBe('G4');
    expect(targetNoteName(0, 7)).toBe('C5'); // a fourth above G4
    expect(targetNoteName(6, 7)).toBe('F#5'); // a major seventh above G4
  });
});

describe('degreeNoteName', () => {
  const name = (pc, rootPc, scaleKey = 'diatonic:Ionian') =>
    degreeNoteName(degreeLabel(pc, rootPc, scaleKey), pc, rootPc);

  it('spells by the degree, not the pitch class', () => {
    expect(name(3, 4)).toBe('D♯'); // 7th of E major, not E♭
    expect(name(10, 5)).toBe('B♭'); // 4th of F major
    expect(name(5, 6)).toBe('E♯'); // 7th of F♯ major
    expect(name(11, 0)).toBe('B');
  });

  it('spells chromatic fallbacks against the tonic letter', () => {
    expect(name(7, 4)).toBe('G'); // ♭3 in E
    expect(name(10, 4)).toBe('A♯'); // ♯4 in E
    expect(name(1, 0)).toBe('D♭'); // ♭2 in C
    expect(name(6, 0)).toBe('F♯'); // ♯4 in C
  });

  it('carries double alterations', () => {
    expect(name(9, 0, 'harmonicMinor:Super Locrian 𝄫7')).toBe('B𝄫');
  });
});
