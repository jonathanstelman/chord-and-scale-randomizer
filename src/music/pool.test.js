import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import {
  ALL_ROOTS,
  ALL_TONAL_CENTER_TYPES,
  CORE_MODES,
  BEGINNER_TRIAD_PAIRS,
  typeKeysInCategories,
  modeCheckState,
  rootsCheckState,
  coreModeKeyForCategory,
  pickRandomTonalCenter,
  pickRandomTonalCenterFromPairs,
  tonalCenterAtIndex,
  pickRandomDuration,
} from './pool';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BEGINNER_TRIAD_PAIRS', () => {
  it('covers exactly the 7 natural roots, in major and minor, and nothing else', () => {
    expect(BEGINNER_TRIAD_PAIRS).toHaveLength(14);
    const naturalRootPcs = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
    for (const pc of naturalRootPcs) {
      expect(BEGINNER_TRIAD_PAIRS).toContainEqual({ rootPc: pc, typeKey: 'maj' });
      expect(BEGINNER_TRIAD_PAIRS).toContainEqual({ rootPc: pc, typeKey: 'min' });
    }
    expect(BEGINNER_TRIAD_PAIRS.every((p) => p.typeKey === 'maj' || p.typeKey === 'min')).toBe(true);
    expect(BEGINNER_TRIAD_PAIRS.every((p) => naturalRootPcs.includes(p.rootPc))).toBe(true);
  });
});

describe('typeKeysInCategories', () => {
  it('returns every type key belonging to the given categories', () => {
    expect(typeKeysInCategories(['Triads'])).toEqual(['maj', 'min', 'dim', 'aug']);
  });

  it('returns an empty array for a category nothing belongs to', () => {
    expect(typeKeysInCategories(['Not A Real Category'])).toEqual([]);
  });
});

describe('modeCheckState', () => {
  const triadsMode = CORE_MODES.find((m) => m.key === 'triads');

  it('is "all" when every type in the mode is enabled', () => {
    expect(modeCheckState(triadsMode, ['maj', 'min', 'dim', 'aug'])).toBe('all');
  });

  it('is "none" when no type in the mode is enabled', () => {
    expect(modeCheckState(triadsMode, [])).toBe('none');
  });

  it('is "some" when only part of the mode is enabled', () => {
    expect(modeCheckState(triadsMode, ['maj'])).toBe('some');
  });
});

describe('rootsCheckState', () => {
  it('is "all" when every root is enabled', () => {
    expect(rootsCheckState(ALL_ROOTS)).toBe('all');
  });

  it('is "none" when no roots are enabled', () => {
    expect(rootsCheckState([])).toBe('none');
  });

  it('is "some" for a partial selection', () => {
    expect(rootsCheckState([0, 7])).toBe('some');
  });
});

describe('coreModeKeyForCategory', () => {
  it('maps a category to its owning core mode', () => {
    expect(coreModeKeyForCategory('Triads')).toBe('triads');
    expect(coreModeKeyForCategory('Seventh Chords')).toBe('sevenths');
  });

  it('falls back to "triads" for an unrecognized category', () => {
    expect(coreModeKeyForCategory('Not A Real Category')).toBe('triads');
  });
});

describe('pickRandomTonalCenter', () => {
  it('picks a type from the enabled-keys pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { type } = pickRandomTonalCenter(['min']);
    expect(type.key).toBe('min');
  });

  it('falls back to the full vocabulary when enabledKeys matches nothing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { type } = pickRandomTonalCenter(['not-a-real-key']);
    expect(type.key).toBe(ALL_TONAL_CENTER_TYPES[0].key);
  });

  it('picks a root from the intersection of enabledRoots and the type\'s valid roots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { rootPc } = pickRandomTonalCenter(['maj'], [5]);
    expect(rootPc).toBe(5);
  });

  it('falls back to the type\'s full valid root set when enabledRoots has no overlap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // enabledRoots is non-empty but deliberately doesn't include any root at all (an
    // impossible UI state in practice, but the function must not pick from an empty
    // array) — same "don't silently produce nothing" guarantee as the enabledKeys case.
    const { rootPc } = pickRandomTonalCenter(['maj'], []);
    expect(rootPc).toBe(ALL_ROOTS[0]);
  });
});

describe('pickRandomTonalCenterFromPairs', () => {
  const pairs = [
    { rootPc: 0, typeKey: 'maj' },
    { rootPc: 9, typeKey: 'min' },
  ];

  it('draws the pair at the index Math.random resolves to', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const { rootPc, type } = pickRandomTonalCenterFromPairs(pairs);
    expect(rootPc).toBe(9);
    expect(type.key).toBe('min');
  });
});

describe('tonalCenterAtIndex', () => {
  const pairs = [
    { rootPc: 0, typeKey: 'maj' },
    { rootPc: 9, typeKey: 'min' },
    { rootPc: 4, typeKey: 'dom7' },
  ];

  it('walks the list in order', () => {
    expect(tonalCenterAtIndex(pairs, 0).rootPc).toBe(0);
    expect(tonalCenterAtIndex(pairs, 1).rootPc).toBe(9);
    expect(tonalCenterAtIndex(pairs, 2).rootPc).toBe(4);
  });

  it('wraps forward past the end of the list', () => {
    expect(tonalCenterAtIndex(pairs, 3).rootPc).toBe(0);
    expect(tonalCenterAtIndex(pairs, 4).rootPc).toBe(9);
  });

  it('wraps a negative index back from the end', () => {
    expect(tonalCenterAtIndex(pairs, -1).rootPc).toBe(4);
  });
});

describe('pickRandomDuration', () => {
  it('returns minBeats when Math.random resolves to 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandomDuration(2, 5)).toBe(2);
  });

  it('returns maxBeats when Math.random resolves just under 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(pickRandomDuration(2, 5)).toBe(5);
  });

  it('works when min/max are passed in swapped order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandomDuration(5, 2)).toBe(2);
  });

  it('clamps below 1 up to a 1-beat minimum', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandomDuration(0, 0)).toBe(1);
  });
});
