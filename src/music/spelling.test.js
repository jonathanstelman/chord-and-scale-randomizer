import { describe, expect, it } from 'vitest';
import {
  spellRoot, spellScaleTonic, typedRootName, majorKeyName, minorKeyName, bothNames,
} from './spelling';
import { CHORD_QUALITIES } from './chordQualities';
import { SCALE_TYPES } from './scaleFamilies';
import { ALL_TONAL_CENTER_TYPES, PURE_TONE_TYPE } from './pool';

const quality = (key) => CHORD_QUALITIES.find((q) => q.key === key);
const scale = (key) => SCALE_TYPES.find((t) => t.key === key);
const ALL_PCS = Array.from({ length: 12 }, (_, i) => i);

describe('chord roots', () => {
  it('major family keeps the major-key spelling', () => {
    expect(ALL_PCS.map((pc) => spellRoot(pc, quality('maj'))))
      .toEqual(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']);
    expect(spellRoot(1, quality('dom7'))).toBe('D♭');
    expect(spellRoot(8, quality('aug'))).toBe('A♭');
  });

  it('minor family spells from the relative major', () => {
    expect(ALL_PCS.map((pc) => spellRoot(pc, quality('min'))))
      .toEqual(['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']);
    expect(spellRoot(1, quality('min7'))).toBe('C♯');
    expect(spellRoot(8, quality('m7b5'))).toBe('G♯');
    expect(spellRoot(1, quality('dim'))).toBe('C♯');
    expect(spellRoot(10, quality('dim7'))).toBe('B♭'); // relative D♭ major, not B major
  });
});

describe('mode roots', () => {
  it('reads the root off the parent key', () => {
    expect(spellRoot(1, scale('diatonic:Dorian'))).toBe('C♯'); // B major
    expect(spellRoot(1, scale('diatonic:Phrygian'))).toBe('C♯'); // A major
    expect(spellRoot(6, scale('diatonic:Lydian'))).toBe('G♭'); // D♭ major
    expect(spellRoot(8, scale('diatonic:Phrygian'))).toBe('G♯'); // E major
    expect(spellRoot(1, scale('diatonic:Ionian'))).toBe('D♭');
    expect(spellRoot(1, scale('diatonic:Aeolian'))).toBe('C♯');
    expect(spellRoot(1, scale('melodicMinor:Lydian Dominant'))).toBe('C♯'); // G♯ melodic minor
    expect(spellRoot(1, scale('harmonicMinor:Lydian ♯2'))).toBe('D♭'); // F harmonic minor
  });

  it('never shows E♯, B♯, F♭, C♭ or a double accidental — falls back to the natural', () => {
    expect(spellRoot(5, scale('melodicMinor:Altered'))).toBe('F'); // strictly E♯, from F♯ melodic minor
    expect(spellRoot(0, scale('harmonicMinor:Super Locrian 𝄫7'))).toBe('C'); // strictly B♯
    expect(spellRoot(7, scale('harmonicMinor:Super Locrian 𝄫7'))).toBe('G'); // strictly F𝄪
    for (const type of ALL_TONAL_CENTER_TYPES) {
      for (const pc of ALL_PCS) {
        const name = spellRoot(pc, type);
        expect(name).not.toMatch(/𝄪|𝄫/);
        expect(['E♯', 'B♯', 'F♭', 'C♭']).not.toContain(name);
      }
    }
  });

  it('gives symmetric scales both names', () => {
    expect(spellRoot(1, scale('symmetric:Whole Tone'))).toBe('C♯ / D♭');
    expect(spellRoot(0, scale('symmetric:Whole Tone'))).toBe('C');
  });
});

describe('bare pitches', () => {
  it('has both names on black keys, one on white', () => {
    expect(ALL_PCS.map(bothNames))
      .toEqual(['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B']);
    expect(spellRoot(6, PURE_TONE_TYPE)).toBe('F♯ / G♭');
    expect(spellRoot(6)).toBe('F♯ / G♭');
  });
});

describe('spellScaleTonic', () => {
  it('spells a mode tonic by its parent, and everything else as a major key', () => {
    expect(spellScaleTonic(1, 'diatonic:Aeolian')).toBe('C♯');
    expect(spellScaleTonic(1, 'diatonic:Ionian')).toBe('D♭');
    expect(spellScaleTonic(1, 'symmetric:Whole Tone')).toBe('D♭');
    expect(spellScaleTonic(1, 'no such scale')).toBe('D♭');
  });
});

describe('typedRootName', () => {
  it('keeps what the user wrote, in the app glyphs', () => {
    expect(typedRootName('d', 'b')).toBe('D♭');
    expect(typedRootName('C', '#')).toBe('C♯');
    expect(typedRootName('c', '♯')).toBe('C♯');
    expect(typedRootName('g', '')).toBe('G');
  });
});

describe('key names', () => {
  it('agree with each other at the F♯/G♭ tie', () => {
    expect(majorKeyName(6)).toBe('F♯');
    expect(minorKeyName(3)).toBe('D♯'); // relative of F♯ major, so the tie propagates
    expect(minorKeyName(6)).toBe('F♯'); // relative of A major
  });
});
