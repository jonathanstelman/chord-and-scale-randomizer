import { describe, it, expect } from 'vitest';
import { parseChordToken, parseCustomBank } from './chordParser';

describe('parseChordToken', () => {
  it('parses a bare root as major', () => {
    expect(parseChordToken('C')).toMatchObject({ rootPc: 0, typeKey: 'maj' });
  });

  it('parses common minor spellings the same way', () => {
    expect(parseChordToken('Em')).toMatchObject({ rootPc: 4, typeKey: 'min' });
    expect(parseChordToken('E min')).toMatchObject({ rootPc: 4, typeKey: 'min' });
    expect(parseChordToken('E-')).toMatchObject({ rootPc: 4, typeKey: 'min' });
  });

  it('is case-insensitive for multi-letter suffixes', () => {
    expect(parseChordToken('G7')).toMatchObject({ rootPc: 7, typeKey: 'dom7' });
    expect(parseChordToken('Gmaj7')).toMatchObject({ rootPc: 7, typeKey: 'maj7' });
    expect(parseChordToken('GMAJ7')).toMatchObject({ rootPc: 7, typeKey: 'maj7' });
  });

  // "M"/"M7" vs "m"/"m7" is the one place case is load-bearing (see the comment on
  // CASE_SENSITIVE_QUALITY_ALIASES in chordParser.js) — worth pinning down explicitly so
  // a future refactor that folds everything to lowercase gets caught immediately.
  it('is case-sensitive for the bare M/m major/minor shorthand', () => {
    expect(parseChordToken('BM')).toMatchObject({ rootPc: 11, typeKey: 'maj' });
    expect(parseChordToken('Bm')).toMatchObject({ rootPc: 11, typeKey: 'min' });
    expect(parseChordToken('BM7')).toMatchObject({ rootPc: 11, typeKey: 'maj7' });
    expect(parseChordToken('Bm7')).toMatchObject({ rootPc: 11, typeKey: 'min7' });
  });

  it('keeps the root exactly as typed, in the app glyphs', () => {
    expect(parseChordToken('Dbm').rootName).toBe('D♭'); // not "corrected" to C♯
    expect(parseChordToken('c#').rootName).toBe('C♯');
    expect(parseChordToken('G♭7').rootName).toBe('G♭');
    expect(parseChordToken('e').rootName).toBe('E');
  });

  it('handles sharp and flat accidentals, ASCII and unicode', () => {
    expect(parseChordToken('C#')).toMatchObject({ rootPc: 1, typeKey: 'maj' });
    expect(parseChordToken('Db')).toMatchObject({ rootPc: 1, typeKey: 'maj' });
    expect(parseChordToken('F♯m')).toMatchObject({ rootPc: 6, typeKey: 'min' });
    expect(parseChordToken('B♭7')).toMatchObject({ rootPc: 10, typeKey: 'dom7' });
  });

  it('resolves half-diminished and diminished-seventh symbols', () => {
    expect(parseChordToken('Bm7b5')).toMatchObject({ rootPc: 11, typeKey: 'm7b5' });
    expect(parseChordToken('Bø7')).toMatchObject({ rootPc: 11, typeKey: 'm7b5' });
    expect(parseChordToken('Bdim7')).toMatchObject({ rootPc: 11, typeKey: 'dim7' });
    expect(parseChordToken('B°7')).toMatchObject({ rootPc: 11, typeKey: 'dim7' });
  });

  it('returns null for an unrecognized root letter', () => {
    expect(parseChordToken('H7')).toBeNull();
  });

  it('returns null for an unrecognized quality suffix', () => {
    expect(parseChordToken('Cxyz')).toBeNull();
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(parseChordToken('')).toBeNull();
    expect(parseChordToken('   ')).toBeNull();
  });
});

describe('parseCustomBank', () => {
  it('splits on commas and newlines and preserves entry order', () => {
    const { entries, errors } = parseCustomBank('C, Dm\nG7');
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { rootPc: 0, typeKey: 'maj', raw: 'C', rootName: 'C' },
      { rootPc: 2, typeKey: 'min', raw: 'Dm', rootName: 'D' },
      { rootPc: 7, typeKey: 'dom7', raw: 'G7', rootName: 'G' },
    ]);
  });

  it('collects unparseable tokens as errors without dropping valid ones', () => {
    const { entries, errors } = parseCustomBank('C, ???, Dm');
    expect(entries.map((e) => e.raw)).toEqual(['C', 'Dm']);
    expect(errors).toEqual(['???']);
  });

  it('ignores blank tokens from stray separators', () => {
    const { entries, errors } = parseCustomBank('C,, ,\nDm');
    expect(entries.map((e) => e.raw)).toEqual(['C', 'Dm']);
    expect(errors).toEqual([]);
  });
});
