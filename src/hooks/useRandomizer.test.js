import { describe, expect, it } from 'vitest';
import {
  growQueue, pregenDepth, visibleQueue, pickNextForRandomizer, pickNextForScaleDegrees,
} from './useRandomizer';
import { ALL_ROOTS, DEFAULT_ENABLED_TYPES } from '../music/pool';
import { SCALE_DEGREE_TYPE, degreeLabel, targetNoteName } from '../music/scaleDegrees';

// A four-chord progression, written out in the order a user would type it — including
// the repeat that ordered mode is required to honour rather than re-roll.
const BANK = [
  { rootPc: 0, typeKey: 'maj' },
  { rootPc: 0, typeKey: 'maj' },
  { rootPc: 5, typeKey: 'maj' },
  { rootPc: 7, typeKey: 'maj' },
];

function settings(patch = {}) {
  return {
    minBeats: 4,
    maxBeats: 4,
    queueDepth: 4,
    enabledTypes: DEFAULT_ENABLED_TYPES,
    enabledRoots: [...ALL_ROOTS],
    enabledPairs: null,
    customBankEnabled: false,
    customBankEntries: [],
    customBankMode: 'random',
    ...patch,
  };
}

function generator(s) {
  return {
    settings: s,
    orderedBankIndexRef: { current: 0 },
    pickNextTonalCenter: pickNextForRandomizer,
  };
}

const identity = (seg) => `${seg.rootPc}:${seg.type.key}`;

describe('growQueue', () => {
  it('fills to the requested depth and leaves a longer queue alone', () => {
    const s = settings();
    const gen = generator(s);
    const queue = [];

    growQueue(queue, 3, null, gen);
    expect(queue).toHaveLength(3);

    growQueue(queue, 2, null, gen);
    expect(queue).toHaveLength(3);
  });

  it('avoids repeats between adjacent entries across the whole queue', () => {
    const s = settings();
    // Repeated runs: avoidance is a re-roll against a random pool, so one pass proves
    // little on its own.
    for (let run = 0; run < 200; run += 1) {
      const queue = [];
      growQueue(queue, 4, null, generator(s));
      for (let i = 1; i < queue.length; i += 1) {
        expect(identity(queue[i])).not.toBe(identity(queue[i - 1]));
      }
    }
  });

  it('avoids repeating the segment already playing, not just earlier queue entries', () => {
    const s = settings({ enabledRoots: [0, 5] });
    for (let run = 0; run < 200; run += 1) {
      const playing = { rootPc: 0, type: { key: 'maj' } };
      const queue = [];
      growQueue(queue, 1, playing, generator(s));
      expect(identity(queue[0])).not.toBe(identity(playing));
    }
  });

  it('walks an ordered custom bank in order, repeats included', () => {
    const s = settings({
      customBankEnabled: true, customBankEntries: BANK, customBankMode: 'ordered',
    });
    const queue = [];
    growQueue(queue, 4, null, generator(s));
    expect(queue.map(identity)).toEqual(['0:maj', '0:maj', '5:maj', '7:maj']);
  });

  // The reason the queue never shrinks mid-session: in ordered mode a discarded entry
  // is a chord the user typed that would never be played.
  it('does not skip ordered-bank entries when the queue is consumed and refilled', () => {
    const s = settings({
      customBankEnabled: true, customBankEntries: BANK, customBankMode: 'ordered',
    });
    const gen = generator(s);
    const queue = [];
    const played = [];

    growQueue(queue, 4, null, gen);
    for (let i = 0; i < 8; i += 1) {
      const seg = queue.shift();
      played.push(identity(seg));
      growQueue(queue, Math.max(pregenDepth(s), queue.length), seg, gen);
    }

    expect(played).toEqual([
      '0:maj', '0:maj', '5:maj', '7:maj',
      '0:maj', '0:maj', '5:maj', '7:maj',
    ]);
  });
});

describe('pregenDepth', () => {
  it('keeps one segment pregenerated even with the queue switched off', () => {
    expect(pregenDepth(settings({ queueDepth: 0 }))).toBe(1);
    expect(pregenDepth(settings({ queueDepth: 3 }))).toBe(3);
  });
});

describe('visibleQueue', () => {
  const queue = [
    { rootName: 'C', typeLabel: 'Major', duration: 4, rootPc: 0 },
    { rootName: 'A', typeLabel: 'Minor', duration: 4, rootPc: 9 },
  ];

  it('shows nothing at depth 0, even though a segment is pregenerated', () => {
    expect(visibleQueue(queue, settings({ queueDepth: 0 }))).toEqual([]);
  });

  it('slices to the configured depth and keeps only what a readout draws', () => {
    expect(visibleQueue(queue, settings({ queueDepth: 1 })))
      .toEqual([{ rootName: 'C', typeLabel: 'Major' }]);
  });
});

describe('pickNextForScaleDegrees', () => {
  const s = (over = {}) => ({
    scaleDegreesRootPc: 0,
    scaleDegreesScaleKey: 'diatonic:Ionian',
    scaleDegreesPool: 'diatonic',
    ...over,
  });

  it('draws from the chosen scale and carries the degree and exact note name', () => {
    for (let i = 0; i < 50; i++) {
      const pick = pickNextForScaleDegrees(s(), null);
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(pick.rootPc);
      expect(pick.type).toBe(SCALE_DEGREE_TYPE);
      expect(pick.degree).toEqual(degreeLabel(pick.rootPc, 0, 'diatonic:Ionian'));
      expect(pick.noteNames).toEqual([targetNoteName(pick.rootPc, 0)]);
    }
  });

  it('labels against the tab root, not C', () => {
    const pick = pickNextForScaleDegrees(s({ scaleDegreesRootPc: 7, scaleDegreesPool: 'chromatic' }), null);
    expect(pick.degree).toEqual(degreeLabel(pick.rootPc, 7, 'diatonic:Ionian'));
    expect(pick.noteNames[0]).toMatch(/[45]$/); // G3 drone: targets G4..F#5
  });

  it('avoids repeating the previous pitch class', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickNextForScaleDegrees(s(), { rootPc: 4 }).rootPc).not.toBe(4);
    }
  });
});

describe('visibleQueue with Scale Degrees segments', () => {
  it('passes the degree through and leaves other segments two-field', () => {
    const queue = [
      { rootName: 'E', typeLabel: '', duration: 4, rootPc: 4, degree: { number: 3, accidental: 0 } },
      { rootName: 'A', typeLabel: 'Minor', duration: 4, rootPc: 9 },
    ];
    expect(visibleQueue(queue, settings({ queueDepth: 2 }))).toStrictEqual([
      { rootName: 'E', typeLabel: '', degree: { number: 3, accidental: 0 } },
      { rootName: 'A', typeLabel: 'Minor' },
    ]);
  });
});
