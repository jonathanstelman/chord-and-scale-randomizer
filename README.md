# Ear Trainer

A browser-based ear-training tool that plays a randomized sequence of tonal centers —
root notes, triads, seventh chords, or chords implied by diatonic/modal/nondiatonic
scales — at a configurable tempo, so you can practice identifying (or playing along
with) whatever comes up next.

The core loop: pick a difficulty tier (or fine-tune individual chord/scale types), hit
**Start Session**, and a new tonal center plays for a random number of beats before the
next one comes up. A metronome (independent volume/on-off) keeps time throughout,
including through an optional silent "gap" between tonal centers to give you a moment to
prepare.

## Running it

```
npm install
npm run dev      # start the dev server
npm run build     # production build
npm run lint      # oxlint
```

## What it does

- **Tonal center types**: root note, major/minor/diminished/augmented triads, seventh
  chords (maj7/min7/dom7/m7♭5/dim7), and chords implied by diatonic modes, melodic minor
  modes, harmonic minor modes, and symmetric scales (whole tone, diminished). Each is
  individually toggleable, grouped under four broad difficulty tiers.
- **Randomizer**: picks a random root + type + duration (in beats, within a
  user-configurable min/max range) for each tonal center, and never repeats the exact
  same one twice in a row. Major/minor/modal roots are kept to key signatures with fewer
  than 7 sharps/flats (so you get "B♭ major," never "A♯ major").
- **Sound**: block chords, arpeggios (a fixed-rate 32nd-note arpeggiator whose pattern
  length is always padded to a beat-friendly size — 1, 2, 4, or 8 notes — so it never
  drifts out of phase with the beat, regardless of chord density), synth pads, or no
  sound at all (metronome-only practice).
- **Metronome**: independent on/off toggle and volume, audible even in "no sound" mode.
- **Silent gap**: an optional number of silent beats between tonal centers to prepare
  before the next one plays.
- **Display**: shows the current and/or next tonal center (each independently
  toggleable), plus a beat-position readout.

## Stack

Vite + React, audio via [Tone.js](https://tonejs.github.io/). No backend — all state is
local to the browser (settings persist to `localStorage`).
