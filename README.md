# Musical Chairs

**[Try it live](https://chord-and-scale-randomizer.vercel.app)**

A browser-based ear-training tool that plays a randomized sequence of tonal centers —
triads, seventh chords, or chords implied by diatonic/modal/nondiatonic scales — at a
configurable tempo, so you can practice identifying (or playing along with) whatever
comes up next.

The core loop: pick a preset (or fine-tune individual chord/scale types), hit **Start
Session**, and a new tonal center plays for a random number of beats before the next one
comes up. A metronome (independent volume/on-off) keeps time throughout, including
through an optional silent "gap" between tonal centers to give you a moment to prepare.

## Running it

```
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # oxlint
```

## What it does

**Content** — what gets played:
- **Tonal center types**: major/minor/diminished/augmented triads, seventh chords
  (maj7/min7/dom7/m7♭5/dim7), and chords implied by diatonic modes, melodic minor modes,
  harmonic minor modes, and symmetric scales (whole tone, diminished). Each is
  individually toggleable, grouped under three broad difficulty tiers.
- **Presets**: one-click starting points — Beginner (triads, slow tempo), Chords Only,
  Scales Only, Everything, and Guitar (the standard beginner open-chord set: C/G/D/E/A
  major plus Am/Dm/Em). The manual type checkboxes remain available underneath as the
  "customize from here" path.
- **Roots filter**: restrict which of the 12 pitch classes are in play, independent of
  which chord/scale types are enabled.
- **Custom bank**: type in your own chord progression as plain text ("C, Am, F, G7") and
  draw only from that set — either randomly or stepped through in the order you wrote
  it, e.g. to drill the actual changes to a song.
- **Randomizer**: picks a random root + type + duration (in beats, within a
  user-configurable min/max range) for each tonal center, and never repeats the exact
  same one twice in a row. Major/minor/modal roots are kept to key signatures with fewer
  than 7 sharps/flats (so you get "B♭ major," never "A♯ major").

**Playback** — how it sounds:
- **Sound**: sustained chords, a harp-like arpeggio (a fixed-rate 32nd-note up/down sweep
  through the chord tones, whose pattern length is always padded to a beat-friendly size
  — 1, 2, 4, or 8 notes — so it never drifts out of phase with the beat, regardless of
  chord density), or no sound at all (metronome-only practice).
- **Density**: caps how many simultaneous notes a chord voices (1-7).
- **Metronome**: independent on/off toggle and volume, audible even in "no sound" mode.
- **Silent gap**: an optional number of silent beats between tonal centers to prepare
  before the next one plays.
- **Display**: shows the current and/or next tonal center (each independently
  toggleable), plus a beat-position readout.

## Stack

Vite + React, audio via [Tone.js](https://tonejs.github.io/). No backend — all state is
local to the browser (settings persist to `localStorage`).

## Going deeper

This README covers what the app does; for anything else:
- [`docs/product.md`](./docs/product.md) — vision, audience, what's explicitly out of scope
- [`docs/guidelines.md`](./docs/guidelines.md) — conventions, testing approach
- [`docs/architecture/`](./docs/architecture/README.md) — the "why" behind non-obvious
  design decisions, one file per subsystem
- [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) — active
  and planned work
