# Audio (`src/audio/engine.js`)

`TonalCenterPlayer` owns every Tone.js node and exposes a small imperative surface
(`playSegment`, `click`, `tickArpeggio`, `setMetronomeVolume`, `stopCurrent`, `dispose`).

- **Gain staging**: `PolySynth` doesn't reduce per-voice volume as more notes stack, so
  dense chords will clip without help. Volume is scaled per note-count
  (`-10*log10(n/4)`, a power-sum estimate) on top of a limiter used as a backstop, not
  the primary defense. The chord synth's release is deliberately short despite its slow
  attack: `playSegment()` sets the shared Volume node for whatever the *new* chord needs,
  but that same node also governs whatever's still ringing out from the *previous*
  chord — a long release would let real leftover energy from the old chord overlap a
  volume setting sized for the new one, and clip anyway. The extra headroom in the
  baseline (-14dB, not the more typical -12dB) covers the one deliberate exception: the
  0.5s attack is comparable to the 0.35s release, so some outgoing/incoming overlap is
  inherent to how the sound is supposed to work, not just a timing edge case.
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
- **Pausing mid-segment** (`pause()` / `resume()`, issue #34): `stopCurrent()` is
  destructive by design — it's what a *new* segment calls — so it can't be reused to
  suspend one. It mutes the arpeggio with nothing to un-mute it before the next segment
  boundary, and releases held notes with nothing to re-attack them. `pause()` therefore
  snapshots what's sounding *before* calling it: the arp notes and whether they were
  muted, the held notes, and **the chord synth's current volume** — `playSegment()`
  scales that by note count, so re-attacking at whatever the synth happens to hold would
  make a resumed chord jump in level. `arpStepIndex` is deliberately left alone by both
  `stopCurrent()` and `resume()`, so a resumed arpeggio carries on through its sweep
  instead of snapping back to the root.

  `playSegment()` clears the snapshot, or a segment boundary arriving between pause and
  resume would re-attack a chord that has already been replaced.

  Resuming needs `Tone.start()` again because the context can be suspended while paused
  (iOS especially). It does *not* need another `unlockIOSMediaPlayback()` gesture: that
  helper is idempotent and its silent `<audio>` element is still looping from `start()`.
