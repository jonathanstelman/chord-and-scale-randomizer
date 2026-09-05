# Audio (`src/audio/engine.js`)

`TonalCenterPlayer` owns every Tone.js node and exposes a small imperative surface
(`playSegment`, `click`, `tickArpeggio`, `setMetronomeVolume`, `stopCurrent`, `dispose`).

- **Gain staging**: `PolySynth` doesn't reduce per-voice volume as more notes stack, so
  dense chords will clip without help. Volume is scaled per note-count
  (`-10*log10(n/4)`, a power-sum estimate) on top of a limiter used as a backstop, not
  the primary defense.
- **The arpeggiator is not a `Tone.Sequence`.** Constructing and starting a
  `Tone.Sequence`/`Part` from inside an already-running `Transport.scheduleRepeat`
  callback mis-schedules it in this Tone.js version (silently drops its first note, or
  fires it late); reassigning a live Sequence's `events` mid-flight has the same problem
  one step later. Instead, `tickArpeggio(time)` is called explicitly once per 32nd note
  from `useRandomizer`'s own clock and reads a plain note-array + step-counter — fully
  deterministic, no hidden rescheduling. Don't "simplify" this back to a Sequence.
- **The arpeggio bounces**: it walks notes `0..n-1..0` (period `2*(n-1)`), not a plain
  ascending cycle — a harp sweep goes both ways. Unlike the old ascending-only cycle
  (whose length always divided evenly into the beat's 8 32nd-notes), this period
  doesn't, so `playSegment()` resets `arpStepIndex` to 0 explicitly on every new chord
  instead of relying on step-count arithmetic to land back on the root at the next beat.
- **iOS mute switch**: iOS/iPadOS Safari puts a page's raw Web Audio output in the
  "Ambient" audio-session category by default, which respects the hardware mute switch —
  native `<audio>`/`<video>` elements get "MediaPlayback" and ignore it.
  `unlockIOSMediaPlayback()` bumps the page into that category by playing a silent,
  looping, throwaway `<audio>` element; the actual synth signal still goes straight to
  `AudioContext.destination` on every platform. Don't route real audio through a
  `MediaStreamAudioDestinationNode` into a media element to achieve this instead — tried
  that first, and it's a real, documented WebKit distortion source, independent of
  volume/gain staging. (A separate, still-open built-in-speaker distortion issue this
  doesn't fix is tracked as
  [issue #4](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/4).)
