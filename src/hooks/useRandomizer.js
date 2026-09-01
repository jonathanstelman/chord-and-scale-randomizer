import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { TonalCenterPlayer } from '../audio/engine';
import {
  pickRandomTonalCenter, pickRandomTonalCenterFromPairs, pickRandomDuration, coreModeKeyForCategory,
} from '../music/pool';
import { voiceChord, padToSimpleArpeggioLength } from '../music/voicing';
import { pitchClassToDisplayName } from '../music/notes';

const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 20;

// `avoid` is the segment that's about to stop playing — re-rolls (root, type) pairs that
// would repeat it exactly. Duration doesn't factor into "the same tonal center"; only
// root + type identity does. The retry cap is just a safety valve against an infinite
// loop in some degenerate future config — with 12 roots always in play, a fresh pick
// almost always succeeds on the first try.
function makeSegment(s, avoid) {
  let seg;
  let attempts = 0;
  do {
    const { rootPc, type } = s.enabledPairs
      ? pickRandomTonalCenterFromPairs(s.enabledPairs)
      : pickRandomTonalCenter(s.enabledTypes, s.enabledRoots);
    const duration = pickRandomDuration(s.minBeats, s.maxBeats);
    seg = {
      rootPc,
      type,
      duration,
      rootName: pitchClassToDisplayName(rootPc),
      typeLabel: type.label,
      modeKey: coreModeKeyForCategory(type.category),
    };
    attempts += 1;
  } while (
    avoid && seg.rootPc === avoid.rootPc && seg.type.key === avoid.type.key
    && attempts < MAX_REPEAT_AVOIDANCE_ATTEMPTS
  );
  return seg;
}

// Drives the "slot machine": a Transport-synced 32nd-note clock (see the scheduleRepeat
// below for why it isn't simpler) counts down the current phase's remaining beats every
// 8th tick. A phase is either a tonal center *playing* (random
// root, random enabled type, random duration between minBeats/maxBeats — never an exact
// repeat of the one that just played) or, if gapBeats > 0, a silent *gap* right after it
// ends, giving the user a moment to prepare before the next one starts. The metronome
// clicks straight through both. The *next* segment is always pre-generated one phase
// ahead, so it can stay visible in the UI as a preview even while a gap is playing.
export function useRandomizer(settings) {
  const [isRunning, setIsRunning] = useState(false);
  const [current, setCurrent] = useState(null);
  const [next, setNext] = useState(null);
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
  const nextSegmentRef = useRef(null);
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
    // Arpeggio mode needs its pattern length itself to be beat-friendly (see
    // padToSimpleArpeggioLength) — chord/pad just sound every voiced note at once, so
    // pattern length doesn't apply to them.
    const noteNames = settingsRef.current.soundType === 'arpeggio'
      ? padToSimpleArpeggioLength(voiced)
      : voiced.map((v) => v.noteName);
    playerRef.current.playSegment(settingsRef.current.soundType, noteNames, time);
  }, []);

  const advanceToNext = useCallback((time) => {
    const seg = nextSegmentRef.current ?? makeSegment(settingsRef.current, segmentRef.current);
    segmentRef.current = seg;
    nextSegmentRef.current = makeSegment(settingsRef.current, seg);
    phaseRef.current = 'playing';
    phaseTotalRef.current = seg.duration;
    beatsRemainingRef.current = seg.duration;
    playSegment(seg, time);

    const upcoming = nextSegmentRef.current;
    Tone.Draw.schedule(() => {
      setCurrent({
        rootName: seg.rootName, typeLabel: seg.typeLabel, durationBeats: seg.duration, modeKey: seg.modeKey,
      });
      setNext({ rootName: upcoming.rootName, typeLabel: upcoming.typeLabel, modeKey: upcoming.modeKey });
      setTotalBeats(seg.duration);
      setIsGap(false);
      setBeatIndex(1);
    }, time);
  }, [playSegment]);

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
    nextSegmentRef.current = null;
    phaseRef.current = null; // no gap before the very first tonal center
    beatsRemainingRef.current = 0;
    stepIndexRef.current = 0;

    // A single clock at 32nd-note granularity — not two separate scheduleRepeats (one at
    // '4n' for beats, one at '32n' for arpeggio steps). Running them as two independent
    // Transport registrations left their relative firing order for a coincident tick
    // effectively unspecified, which is exactly how a chord change could update the
    // arpeggiator's notes *after* that beat's own arp step had already read the old ones
    // — a race, not a fixed delay, but one that reliably manifested as "late by one
    // 32nd note" because it was the arp step scheduled first. Deriving beat boundaries
    // from a step counter (every 8th 32nd note) inside one callback makes the order
    // exact: beat-logic (which may hand the player new arp notes) always runs before
    // tickArpeggio() reads them, every time, on the same tick.
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

  const stop = useCallback(() => {
    // Release whatever's still sounding before stopping the Transport.
    playerRef.current?.stopCurrent();
    Tone.Transport.stop();
    if (repeatIdRef.current !== null) {
      Tone.Transport.clear(repeatIdRef.current);
      repeatIdRef.current = null;
    }
    setIsRunning(false);
    setCurrent(null);
    setNext(null);
    setBeatIndex(0);
    setTotalBeats(0);
    setIsGap(false);
  }, []);

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

  return { isRunning, current, next, beatIndex, totalBeats, isGap, start, stop };
}
