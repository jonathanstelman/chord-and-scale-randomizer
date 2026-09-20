import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { TonalCenterPlayer, unlockIOSMediaPlayback } from '../audio/engine';
import {
  pickRandomTonalCenter, pickRandomTonalCenterFromPairs, tonalCenterAtIndex, pickRandomDuration,
  pickRandomRootPc, pickRandomScalePc, PURE_TONE_TYPE,
} from '../music/pool';
import {
  SCALE_DEGREE_TYPE, degreeLabel, degreeNoteName, scaleDegreePool, scaleDegreesKey,
  targetNoteName,
} from '../music/scaleDegrees';
import { voiceChord, padToSimpleArpeggioLength } from '../music/voicing';
import { spellRoot, spellScaleTonic } from '../music/spelling';
import { useWakeLock } from './useWakeLock';

const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 20;

function buildSegment(rootPc, type, s) {
  return {
    rootPc,
    type,
    duration: pickRandomDuration(s.minBeats, s.maxBeats),
    rootName: spellRoot(rootPc, type), // a picker may override — see makeSegment
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
  const inScale = s.pureToneMode === 'scale';
  let rootPc;
  let attempts = 0;
  do {
    rootPc = inScale
      ? pickRandomScalePc(s.pureToneScaleRootPc, s.pureToneScaleKey)
      : pickRandomRootPc(s.enabledRoots);
    attempts += 1;
  } while (avoid && rootPc === avoid.rootPc && attempts < MAX_REPEAT_AVOIDANCE_ATTEMPTS);
  if (!inScale) return { rootPc, type: PURE_TONE_TYPE }; // a bare pitch: both names
  // In a scale the pitch has a degree, and the degree fixes its spelling.
  const tonic = spellScaleTonic(s.pureToneScaleRootPc, s.pureToneScaleKey);
  const label = degreeLabel(rootPc, s.pureToneScaleRootPc, s.pureToneScaleKey);
  return { rootPc, type: PURE_TONE_TYPE, rootName: degreeNoteName(label, rootPc, tonic) };
}

// Scale Degrees tab's "what's next" source. Carries its degree and its exact note name
// alongside the usual pair, and a rootName spelled by the degree rather than the
// key-blind default — see docs/architecture/randomizer.md's Scale Degrees section for
// why each rides on the segment. Same repeat avoidance as pickNextForPureTone.
export function pickNextForScaleDegrees(s, avoid) {
  const rootPc = s.scaleDegreesRootPc;
  const scaleKey = scaleDegreesKey(s);
  const pool = scaleDegreePool(rootPc, scaleKey, s.scaleDegreesPool);
  let pc;
  let attempts = 0;
  do {
    pc = pool[Math.floor(Math.random() * pool.length)];
    attempts += 1;
  } while (avoid && pc === avoid.rootPc && attempts < MAX_REPEAT_AVOIDANCE_ATTEMPTS);
  const degree = degreeLabel(pc, rootPc, scaleKey);
  return {
    rootPc: pc,
    type: SCALE_DEGREE_TYPE,
    degree,
    rootName: degreeNoteName(degree, pc, spellScaleTonic(rootPc, scaleKey)),
    noteNames: [targetNoteName(pc, rootPc)],
  };
}

function voicedNoteNames(segment, soundType, s) {
  const voiced = voiceChord(segment.rootPc, segment.type.intervals, {
    rootOctave: 3,
    upperOctave: 4,
    maxNotes: s.maxChordNotes,
  });
  // Arpeggio mode needs its pattern length itself to be beat-friendly (see
  // padToSimpleArpeggioLength) — chord/pad just sound every voiced note at once, so
  // pattern length doesn't apply to them.
  return soundType === 'arpeggio'
    ? padToSimpleArpeggioLength(voiced)
    : voiced.map((v) => v.noteName);
}

// A picker may return more than { rootPc, type } — Scale Degrees adds `degree` and
// `noteNames`, and any picker may add `rootName` to override buildSegment's spelling —
// and whatever it adds rides along on the segment.
function makeSegment(s, avoid, orderedBankIndexRef, pickNextTonalCenter) {
  const { rootPc, type, ...extra } = pickNextTonalCenter(s, avoid, orderedBankIndexRef);
  return { ...buildSegment(rootPc, type, s), ...extra };
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

// The settings that decide what a segment *is* — what gets picked and how long it lasts.
// A change to any of these mid-session replaces the pregenerated queue (see
// rebuildQueue); everything else (tempo, gap, metronome, sound type, display) leaves it
// alone. Serialised to a string so the effect can key on the values, not on `settings`,
// which is a new object on every keystroke.
const QUEUE_SETTINGS = [
  'enabledTypes', 'enabledRoots', 'enabledPairs',
  'customBankEnabled', 'customBankMode', 'customBankEntries',
  'minBeats', 'maxBeats',
  'pureToneMode', 'pureToneScaleRootPc', 'pureToneScaleKey',
  'scaleDegreesRootPc', 'scaleDegreesScaleKey', 'scaleDegreesPool',
];

export function queueSettingsKey(s) {
  return JSON.stringify(QUEUE_SETTINGS.map((k) => s[k]));
}

// Throw away every pregenerated segment and regrow from the current settings, to the
// same length as before (never shorter — see "Queue depth"). The one subtlety is the
// ordered custom bank: its cursor already advanced past every queued entry, so it's
// rewound by that many first, or the progression would skip ahead by a queue's worth.
// See docs/architecture/randomizer.md's "Settings changes replace the queue".
export function rebuildQueue(queue, depth, tail, gen) {
  const ref = gen.orderedBankIndexRef;
  ref.current = Math.max(0, ref.current - queue.length);
  const length = Math.max(depth, queue.length);
  queue.length = 0;
  growQueue(queue, length, tail, gen);
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
  return queue.slice(0, s.queueDepth).map(readoutFields);
}

// The fields a readout draws (see tonalCenterPhrase). `degree` only when the segment has
// one, so tab-agnostic consumers and tests see the same two-field shape they always did.
function readoutFields({ rootName, typeLabel, degree }) {
  return degree ? { rootName, typeLabel, degree } : { rootName, typeLabel };
}

// Drives the "slot machine" — a phase is either a tonal center playing or a silent gap;
// see docs/architecture/randomizer.md for the phase/pregeneration model, and its
// "Practice tabs" section for what `pickNextTonalCenter`/`forceSoundType`/`drone` are for.
export function useRandomizer(settings, options = {}) {
  const { pickNextTonalCenter = pickNextForRandomizer, forceSoundType, drone } = options;
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
  // Read at start() time, like settingsRef, so start() needn't be rebuilt per edit.
  const droneRef = useRef(drone);
  useEffect(() => {
    droneRef.current = drone;
  }, [drone]);

  const playSegment = useCallback((segment, time) => {
    const soundType = forceSoundType ?? settingsRef.current.soundType;
    // A segment that names its own notes (Scale Degrees) skips voicing entirely.
    const noteNames = segment.noteNames ?? voicedNoteNames(segment, soundType, settingsRef.current);
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
      setCurrent({ ...readoutFields(seg), durationBeats: seg.duration });
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
    playerRef.current.setToneVolume(settingsRef.current.toneVolume);
    playerRef.current.setToneMuted(!settingsRef.current.toneAudio);
    playerRef.current.setDroneMuted(!settingsRef.current.droneAudio);
    if (droneRef.current) {
      playerRef.current.setDroneVolume(droneRef.current.volume);
      playerRef.current.startDrone(droneRef.current.notes);
    }

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
    // Release whatever's still sounding before stopping the Transport. The drone isn't
    // part of stopCurrent() by design (docs/architecture/audio.md's "Drone"), so it needs
    // its own call here or it outlives the session — and the tab switch that stops it.
    playerRef.current?.stopCurrent();
    playerRef.current?.stopDrone();
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

  // A change to what gets picked replaces the queue at once, running or paused — the
  // segment already sounding finishes, but nothing behind it plays under stale settings.
  // Pause made this the natural flow (pause → change → resume); before it, stop → play
  // reset the queue anyway. The ref skips the run where `isRunning` flips on: start()
  // has just built a fresh queue. See docs/architecture/randomizer.md's "Settings
  // changes replace the queue".
  const queueKey = queueSettingsKey(settings);
  const queueKeyRef = useRef(queueKey);
  useEffect(() => {
    const changed = queueKeyRef.current !== queueKey;
    queueKeyRef.current = queueKey;
    if (!isRunning || !changed) return;
    const s = settingsRef.current;
    const q = queueRef.current;
    rebuildQueue(q, pregenDepth(s), segmentRef.current, {
      settings: s, orderedBankIndexRef, pickNextTonalCenter,
    });
    setQueue(visibleQueue(q, s));
  }, [isRunning, queueKey, pickNextTonalCenter]);

  // Keep tempo/metronome-volume changes live while running.
  useEffect(() => {
    if (isRunning) Tone.Transport.bpm.value = settings.bpm;
  }, [isRunning, settings.bpm]);

  useEffect(() => {
    if (isRunning) playerRef.current?.setMetronomeVolume(settings.metronomeVolume);
  }, [isRunning, settings.metronomeVolume]);

  useEffect(() => {
    if (isRunning) playerRef.current?.setToneVolume(settings.toneVolume);
  }, [isRunning, settings.toneVolume]);

  useEffect(() => {
    if (isRunning) playerRef.current?.setToneMuted(!settings.toneAudio);
  }, [isRunning, settings.toneAudio]);

  useEffect(() => {
    if (isRunning) playerRef.current?.setDroneMuted(!settings.droneAudio);
  }, [isRunning, settings.droneAudio]);

  // The drone follows Root/Scale/Sound live, but not while paused — see
  // docs/architecture/randomizer.md's Scale Degrees section for both halves of that.
  const droneNotesKey = drone?.notes.join(' ');
  useEffect(() => {
    if (isRunning && !isPaused && droneNotesKey) playerRef.current?.startDrone(droneNotesKey.split(' '));
  }, [isRunning, isPaused, droneNotesKey]);

  const droneVolume = drone?.volume;
  useEffect(() => {
    if (isRunning && droneVolume !== undefined) playerRef.current?.setDroneVolume(droneVolume);
  }, [isRunning, droneVolume]);

  useEffect(() => () => {
    if (repeatIdRef.current !== null) Tone.Transport.clear(repeatIdRef.current);
    Tone.Transport.stop();
    playerRef.current?.dispose();
  }, []);

  return {
    isRunning, isPaused, current, queue, beatIndex, totalBeats, isGap, start, pause, resume, stop,
  };
}
