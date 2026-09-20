import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { TonalCenterPlayer, unlockIOSMediaPlayback } from '../audio/engine';
import {
  pickRandomTonalCenter, pickRandomTonalCenterFromPairs, tonalCenterAtIndex, pickRandomDuration,
  pickRandomRootPc, pickRandomScalePc, PURE_TONE_TYPE,
} from '../music/pool';
import { voiceChord, padToSimpleArpeggioLength } from '../music/voicing';
import { pitchClassToDisplayName } from '../music/notes';
import { useWakeLock } from './useWakeLock';

const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 20;

function buildSegment(rootPc, type, s) {
  return {
    rootPc,
    type,
    duration: pickRandomDuration(s.minBeats, s.maxBeats),
    rootName: pitchClassToDisplayName(rootPc),
    typeLabel: type.label,
  };
}

// The chord/scale randomizer tab's "what's next" source: custom bank (ordered or
// random) takes priority over Guitar-style pairs, which takes priority over the general
// enabledTypes/enabledRoots pool. `avoid` is the segment that's about to stop playing —
// every source but ordered custom-bank mode re-rolls a pick that would repeat it exactly
// (root + type identity; duration doesn't count). Ordered mode is walking a
// user-written progression in a fixed order — a repeated chord in a typed-out
// progression (e.g. "C, C, F, G") is intentional, so it returns straight away instead of
// looping. The retry cap is just a safety valve against an infinite loop in some
// degenerate future config — with 12 roots always in play, a fresh pick almost always
// succeeds on the first try.
//
// `orderedBankIndexRef` is only read/advanced for custom-bank "ordered" mode.
export function pickNextForRandomizer(s, avoid, orderedBankIndexRef) {
  const usingCustomBank = s.customBankEnabled && s.customBankEntries.length > 0;

  if (usingCustomBank && s.customBankMode === 'ordered') {
    const index = orderedBankIndexRef.current;
    orderedBankIndexRef.current += 1;
    return tonalCenterAtIndex(s.customBankEntries, index);
  }

  let picked;
  let attempts = 0;
  do {
    picked = usingCustomBank
      ? pickRandomTonalCenterFromPairs(s.customBankEntries)
      : s.enabledPairs
        ? pickRandomTonalCenterFromPairs(s.enabledPairs)
        : pickRandomTonalCenter(s.enabledTypes, s.enabledRoots);
    attempts += 1;
  } while (
    avoid && picked.rootPc === avoid.rootPc && picked.type.key === avoid.type.key
    && attempts < MAX_REPEAT_AVOIDANCE_ATTEMPTS
  );
  return picked;
}

// Pure Tone tab's "what's next" source — see docs/architecture/randomizer.md's Pure Tone
// section for the chromatic/scale preset split. Same repeat-avoidance idea as
// pickNextForRandomizer, simplified to just the root pitch class.
export function pickNextForPureTone(s, avoid) {
  let rootPc;
  let attempts = 0;
  do {
    rootPc = s.pureToneMode === 'scale'
      ? pickRandomScalePc(s.pureToneScaleRootPc, s.pureToneScaleKey)
      : pickRandomRootPc(s.enabledRoots);
    attempts += 1;
  } while (avoid && rootPc === avoid.rootPc && attempts < MAX_REPEAT_AVOIDANCE_ATTEMPTS);
  return { rootPc, type: PURE_TONE_TYPE };
}

function makeSegment(s, avoid, orderedBankIndexRef, pickNextTonalCenter) {
  const { rootPc, type } = pickNextTonalCenter(s, avoid, orderedBankIndexRef);
  return buildSegment(rootPc, type, s);
}

// Grow `queue` in place until it holds `depth` segments, each avoiding the one before it
// — `tail` stands in for the segment already playing, for when the queue is empty. `gen`
// bundles what makeSegment needs: settings, the ordered-bank cursor, the tab's picker.
// Why avoidance stays adjacent-only: docs/architecture/randomizer.md's "Queue depth".
export function growQueue(queue, depth, tail, gen) {
  while (queue.length < depth) {
    const previous = queue[queue.length - 1] ?? tail;
    queue.push(makeSegment(gen.settings, previous, gen.orderedBankIndexRef, gen.pickNextTonalCenter));
  }
}

// How many segments to keep pregenerated. One is the floor even with the queue switched
// off: the clock hands the player its next segment a phase early regardless of whether
// anything is displaying it.
export function pregenDepth(s) {
  return Math.max(1, s.queueDepth);
}

// What the display gets: the first `queueDepth` segments, reduced to the two fields a
// readout draws. This slice — not the queue's own length, which never drops below one —
// is what decides whether anything renders.
export function visibleQueue(queue, s) {
  return queue.slice(0, s.queueDepth).map(({ rootName, typeLabel }) => ({ rootName, typeLabel }));
}

// Drives the "slot machine" — a phase is either a tonal center playing or a silent gap;
// see docs/architecture/randomizer.md for the phase/pregeneration model, and its
// "Practice tabs" section for what `pickNextTonalCenter`/`forceSoundType` are for.
export function useRandomizer(settings, options = {}) {
  const { pickNextTonalCenter = pickNextForRandomizer, forceSoundType } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [beatIndex, setBeatIndex] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [isGap, setIsGap] = useState(false);

  const playerRef = useRef(null);
  const repeatIdRef = useRef(null);
  const phaseRef = useRef(null); // 'playing' | 'gap' | null (null only before the first segment)
  const phaseTotalRef = useRef(0);
  const beatsRemainingRef = useRef(0);
  const stepIndexRef = useRef(0); // 32nd-note steps since this session's Transport.start()
  const segmentRef = useRef(null);
  // Pregenerated upcoming segments, soonest first. Never shrinks mid-session — see
  // docs/architecture/randomizer.md's "Queue depth".
  const queueRef = useRef([]);
  const orderedBankIndexRef = useRef(0); // custom-bank "ordered" mode's position in the list
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const playSegment = useCallback((segment, time) => {
    const voiced = voiceChord(segment.rootPc, segment.type.intervals, {
      rootOctave: 3,
      upperOctave: 4,
      maxNotes: settingsRef.current.maxChordNotes,
    });
    const soundType = forceSoundType ?? settingsRef.current.soundType;
    // Arpeggio mode needs its pattern length itself to be beat-friendly (see
    // padToSimpleArpeggioLength) — chord/pad just sound every voiced note at once, so
    // pattern length doesn't apply to them.
    const noteNames = soundType === 'arpeggio'
      ? padToSimpleArpeggioLength(voiced)
      : voiced.map((v) => v.noteName);
    playerRef.current.playSegment(soundType, noteNames, time);
  }, [forceSoundType]);

  const advanceToNext = useCallback((time) => {
    const s = settingsRef.current;
    const q = queueRef.current;
    const gen = { settings: s, orderedBankIndexRef, pickNextTonalCenter };

    growQueue(q, 1, segmentRef.current, gen);
    const seg = q.shift();
    segmentRef.current = seg;
    // Refill behind the one just taken. The queue only ever grows back to the length it
    // already had, so lowering the depth mid-session hides entries rather than
    // discarding them — which would skip chords in ordered custom-bank mode.
    growQueue(q, Math.max(pregenDepth(s), q.length), seg, gen);

    phaseRef.current = 'playing';
    phaseTotalRef.current = seg.duration;
    beatsRemainingRef.current = seg.duration;
    playSegment(seg, time);

    const upcoming = visibleQueue(q, s);
    Tone.Draw.schedule(() => {
      setCurrent({ rootName: seg.rootName, typeLabel: seg.typeLabel, durationBeats: seg.duration });
      setQueue(upcoming);
      setTotalBeats(seg.duration);
      setIsGap(false);
      setBeatIndex(1);
    }, time);
  }, [playSegment, pickNextTonalCenter]);

  const beginGap = useCallback((time, gapBeats) => {
    phaseRef.current = 'gap';
    phaseTotalRef.current = gapBeats;
    beatsRemainingRef.current = gapBeats;
    playerRef.current.stopCurrent(time);

    Tone.Draw.schedule(() => {
      setCurrent(null);
      setTotalBeats(gapBeats);
      setIsGap(true);
      setBeatIndex(1);
    }, time);
  }, []);

  const start = useCallback(async () => {
    // Synchronous, before the first await: <audio>.play() needs the same live user
    // gesture Tone.start() below does (see unlockIOSMediaPlayback in audio/engine.js), so
    // it can't wait until TonalCenterPlayer gets constructed a few lines down.
    unlockIOSMediaPlayback();
    await Tone.start();
    // A bit more scheduling headroom than Tone's 0.1s default: audio events are queued
    // this far ahead of when they actually play, so a slow React render or GC pause on
    // the main thread has room to finish without the audio thread running dry (which is
    // what a live scheduling glitch — as opposed to a signal-level clipping problem —
    // actually sounds like: a click, stutter, or crackle).
    Tone.getContext().lookAhead = 0.2;
    Tone.Transport.bpm.value = settingsRef.current.bpm;
    if (!playerRef.current) playerRef.current = new TonalCenterPlayer();
    playerRef.current.setMetronomeVolume(settingsRef.current.metronomeVolume);

    segmentRef.current = null;
    queueRef.current = [];
    phaseRef.current = null; // no gap before the very first tonal center
    beatsRemainingRef.current = 0;
    stepIndexRef.current = 0;
    // Stop-then-play is a fresh run: an ordered custom bank restarts from its top. Pause
    // is the operation that keeps your place — see docs/architecture/randomizer.md's
    // "Pause vs. stop".
    orderedBankIndexRef.current = 0;
    setIsPaused(false);

    // One clock, not two — see docs/architecture/randomizer.md for why splitting beat and
    // arpeggio timing into separate scheduleRepeats caused the arp to occasionally lag a
    // 32nd note behind a fresh chord.
    repeatIdRef.current = Tone.Transport.scheduleRepeat((time) => {
      const stepIndex = stepIndexRef.current;
      stepIndexRef.current += 1;
      const isBeatBoundary = stepIndex % 8 === 0;

      if (isBeatBoundary) {
        beatsRemainingRef.current -= 1;
        const phaseEnding = beatsRemainingRef.current <= 0;

        if (settingsRef.current.metronomeAudio) {
          playerRef.current.click(time, phaseEnding);
        }

        if (phaseEnding) {
          const gapBeats = settingsRef.current.gapBeats;
          if (phaseRef.current === 'playing' && gapBeats > 0) {
            beginGap(time, gapBeats);
          } else {
            advanceToNext(time);
          }
        } else {
          const beatNum = phaseTotalRef.current - beatsRemainingRef.current + 1;
          Tone.Draw.schedule(() => setBeatIndex(beatNum), time);
        }
      }

      playerRef.current.tickArpeggio(time);
    }, '32n', 0);

    Tone.Transport.start();
    setIsRunning(true);
  }, [advanceToNext, beginGap]);

  // Tone.Transport.pause() halts the clock where it stands, so the beat counter, the
  // segment's remaining beats and the ordered-bank cursor all keep their values; start()
  // below resumes from that point rather than from zero.
  const pause = useCallback(() => {
    Tone.Transport.pause();
    playerRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(async () => {
    // The context can be suspended while paused (iOS especially). Tone.start() is a
    // no-op on an already-running context, and the <audio> unlock is idempotent and
    // still looping from start(), so this is the whole resume path.
    await Tone.start();
    Tone.Transport.start();
    playerRef.current?.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    // Release whatever's still sounding before stopping the Transport.
    playerRef.current?.stopCurrent();
    Tone.Transport.stop();
    if (repeatIdRef.current !== null) {
      Tone.Transport.clear(repeatIdRef.current);
      repeatIdRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    setCurrent(null);
    queueRef.current = [];
    setQueue([]);
    setBeatIndex(0);
    setTotalBeats(0);
    setIsGap(false);
  }, []);

  useWakeLock(isRunning && !isPaused);

  // Deepening the queue mid-session fills the new slots straight away rather than
  // leaving them blank until the next segment boundary. Shallowing it only re-slices
  // what's already pregenerated (see advanceToNext). Keyed to the depth alone, not to
  // `settings` — that object is new on every edit, so a bpm keystroke would rebuild the
  // queue array mid-playback.
  useEffect(() => {
    if (!isRunning) return;
    const s = settingsRef.current;
    const q = queueRef.current;
    growQueue(q, pregenDepth(s), segmentRef.current, {
      settings: s, orderedBankIndexRef, pickNextTonalCenter,
    });
    setQueue(visibleQueue(q, s));
  }, [isRunning, settings.queueDepth, pickNextTonalCenter]);

  // Keep tempo/metronome-volume changes live while running.
  useEffect(() => {
    if (isRunning) Tone.Transport.bpm.value = settings.bpm;
  }, [isRunning, settings.bpm]);

  useEffect(() => {
    if (isRunning) playerRef.current?.setMetronomeVolume(settings.metronomeVolume);
  }, [isRunning, settings.metronomeVolume]);

  useEffect(() => () => {
    if (repeatIdRef.current !== null) Tone.Transport.clear(repeatIdRef.current);
    Tone.Transport.stop();
    playerRef.current?.dispose();
  }, []);

  return {
    isRunning, isPaused, current, queue, beatIndex, totalBeats, isGap, start, pause, resume, stop,
  };
}
