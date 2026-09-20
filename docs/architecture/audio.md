# Audio (`src/audio/engine.js`)

`TonalCenterPlayer` owns every Tone.js node and exposes a small imperative surface
(`playSegment`, `click`, `tickArpeggio`, `setMetronomeVolume`, `stopCurrent`, `pause`,
`resume`, `startDrone`, `stopDrone`, `setDroneVolume`, `dispose`).

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
  resume would re-attack a chord that has already been replaced. The drone keeps its own
  snapshot for exactly that reason — see "Drone" below.

  Resuming needs `Tone.start()` again because the context can be suspended while paused
  (iOS especially). It does *not* need another `unlockIOSMediaPlayback()` gesture: that
  helper is idempotent and its silent `<audio>` element is still looping from `start()`.
- **Volume sliders**: the UI's 0–100 volume sliders (`setMetronomeVolume`,
  `setDroneVolume`) share one mapping, `sliderPercentToDb`: linear in dB, 0.4dB per
  step, so 100 is the trim ceiling (0dB) and 0 is -40dB — quiet enough to sit under
  everything else but *not* literal silence, which is what the metronome's on/off toggle
  (or `stopDrone`) is for. The drone's slider trim lives on its own `Tone.Volume` node
  and its per-note-count scaling lives on the synth's `volume`, so the two never have to
  be recombined: `setDroneVolume` can't disturb the note-count trim and `startDrone`
  can't disturb the user's setting. Don't collapse them onto one node and store the
  percent to recompute from — that's the entanglement the two-node layout exists to
  make impossible.
- **Drone** (Scale Degrees tab, issue #8): a tonic that sustains for the whole session,
  including through the rest/gap, while target notes come and go over it. The gotcha is
  that everything else in the engine is built around `stopCurrent()` being the
  destructive "new segment" call — `playSegment()` calls it, `beginGap` calls it,
  `useRandomizer.stop()` calls it — so a drone that shared `chordSynth`/`heldNotes` with
  the target would be released at every segment boundary and every rest. Folding it into
  the held-chord path with a "but not these notes" exception would make every one of
  those call sites drone-aware. Instead the drone is independent *by construction*: its
  own `PolySynth` → own `Tone.Volume` → the shared limiter, and its own `droneNotes`
  state, so `stopCurrent()`/`playSegment()` have nothing of the drone's to touch. Keep it
  that way — if a future change needs the drone and the segment to interact, do it in
  the caller, not by giving `stopCurrent` a reason to know about `droneNotes`.

  *Sound*: sine, 1s attack (it fades in rather than thumping when a session starts),
  sustain 1, 1.5s release. The long release is the fade you hear on stop/pause and the
  crossfade when `startDrone` replaces a sounding drone (it releases the old notes and
  attacks the new ones at the same `time`). That crossfade is the same overlap hazard
  the chord synth's short release avoids — the synth's note-count trim is set for the
  *new* drone while the old one rings out — but a replacement only happens on a
  settings change and the limiter backstops it, so the longer release wins here.

  *Level*: `droneBaseVolume` equals `chordBaseVolume` (-14dB), both calibrated at 4
  voices and scaled by the same `noteCountTrimDb`, so at the slider's ceiling the drone
  — whatever its shape, 1 to 3 notes — matches the target's level, and the slider only
  ever pulls it down from there (see "Volume sliders"). It started 6dB lower on the
  theory that the target must read *over* the reference; the first listening session
  reversed that — an octave-3 sine sits low enough in the spectrum that it needs to
  reach the target's level to register at all, and the ceiling was the problem, not the
  default. The default slider position (85, ~6dB off the ceiling) came from the same
  session. Two sines at -8dBFS can sum to -2dBFS, inside the limiter's -1dB threshold
  but not by much; the 'chord' drone's three voices are trimmed lower, so it isn't the
  worst case. The one still-open level question is a *target* level independent of the
  drone (issue #58).

  *Pause/resume*: `pause()` snapshots the drone's notes in `suspendedDrone` and releases
  it; `resume()` calls `startDrone` with them, which recomputes the note-count trim, so
  unlike the chord there's no volume to snapshot. The snapshot is deliberately *not* a
  field of `suspended`: `playSegment()` clears that object to stop a stale chord from
  re-attacking, and the drone must not be dropped by a segment-side decision. Its own
  calls play that role instead — `startDrone`/`stopDrone` clear `suspendedDrone`, so an
  explicit drone change while paused supersedes the snapshot, exactly as a new segment
  supersedes the chord's. Note that `useRandomizer.stop()` calls `stopCurrent()` only,
  so a session's owner has to call `stopDrone()` itself on stop and tab switch;
  `dispose()` does release it.

  *Gain staging exposure*: drone + target is 2–4 simultaneous sine voices, plus the
  click — the 'chord' drone under a target is the densest thing the app produces. At
  the slider ceiling the power sum is roughly that of a 4-note chord on the Randomizer
  tab; at the default it's dominated by the target alone. This is the built-in-speaker
  distortion case tracked as
  [issue #4](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/4),
  documented here rather than fixed — the tab is validated on headphones/desktop and #4
  keeps its own priority.
