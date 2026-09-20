# Changelog

What shipped, newest first. Issue numbers link to the reasoning; the *why* behind a
subsystem's design lives in [`docs/architecture/`](./docs/architecture/README.md), and
the working material behind visual decisions lives in
[`docs/design/`](./docs/design/).

This is a note of what changed, not a release log — the app deploys from `main` and has
no versions.

## A mixer (2026-09-20)

- **#58** — Every level in one group: a **Mixer** in the player column of every tab, after
  Display, with a channel strip per sound source — what the tab plays (Tonal center on
  Chords & Scales, Note on the other two), Drone (Scale Degrees), Metronome — each with a name, a mute and a slider
  on one grid, so every slider is the same length. The first is new: the tonal center
  never had its own level, so the only way to
  balance the drone against the target was to push the drone up. Two layouts were
  prototyped in the app and compared on a phone; the mixer won because balancing is a
  relationship between two levels and the local layout put them a screen apart.
  **Every channel has a mute**, which retired the "No Sound" sound type (a second control
  silencing the same thing; persisted values migrate to "Chord, muted"). The metronome's
  on/off and level moved here from Timing. The Chords & Scales "Sound" group became
  **Voicing** (Play as / Density), the word the Drone group uses for the same decision;
  Pure Tone's and Scale Degrees' **Notes** groups became **Note bank**, and Scale
  Degrees' Labels field moved to Display, where how-it's-written belongs.
  `randomizer.md`, "Mixer".

## The accents mean the practice modes (2026-09-20)

- Cobalt, brass and flame now identify the three tabs — Chords & Scales, Pure Tone,
  Scale Degrees — on the tab underline and the idle card's chair, so switching modes
  visibly changes the page. **This reverses #21's "accent colour on a chair means
  nothing"**: the colours used to code Triads / Seventh Chords / Scales on three big
  coloured blocks in the Tonal centers group, the one selection surface not built from
  chips, checkboxes and radios. Those blocks are plain checkboxes now, in a row like the
  Roots grid, and the accents carry one meaning. `design-language.md`, "The accents".

## Roots spelled by their context (2026-09-20)

- **#62** — Every pitch class had one display spelling, chosen for its major key, so
  the app showed D♭ Minor, A♭ Phrygian, and "in D♭ Minor" with a C♭ in it. Now **a
  pitch is named by the key it's in**: C♯ Minor, C♯ Dorian (from B major), G♭ Lydian
  (from D♭ major), D♭ Major. Symmetric scales and Pure Tone's chromatic mode —
  pitches with no key — take **either name at random**, per pick: meeting C♯ and D♭
  separately is the practice a lead sheet demands, and showing both at once looked
  awkward. Pickers keep one fixed spelling. Roots never carry E♯, B♯,
  F♭, C♭ or a double accidental (F Altered, not E♯ Altered). **The custom chord bank is
  exempt** — "Dbm" stays D♭ Minor, in the echo and on the display, because a student
  working through a modulating tune has reasons the rule can't see. One function,
  `spelling.js`, feeds every surface; `music-theory.md`, "Root spelling".
- Four labels made precise: the masthead no longer claims every mode "sets a new tonal
  center" (Scale Degrees doesn't); **"Rest between changes"**, not "tones"; Pure Tone's
  description no longer says "no scale context" (its Scale mode has one); and
  **"Scales"** replaces "Extended (Scale Tones)" / "scale-tone chords" — one name, with
  the preset description saying how they're sounded.
- Guidelines gained the rule as a UI convention, so the next surface that names a
  pitch doesn't re-learn it.

## Scale Degrees tab (2026-09-20)

A third practice tab, for functional ear training: a tonic **drone** sustains for the
whole session and each segment strikes one note from the octave above it, which the
display names as a **scale degree** ("♭3", or "me") rather than an absolute pitch — the
Functional Ear Trainer idea, on this app's beat clock and passive-reveal model.

Specced in one interrogation session, then built as **three parallel streams against a
contract** (#51 music helpers, #52 drone engine, #53 settings UI) and integrated in a
fourth (#54). The contract — settings keys, stubbed helper signatures, engine method
signatures, segment shape — landed first so the streams couldn't drift.

- **#8** — The tab. Root + scale set the key; the target pool is **Scale** (that
  scale's tones) or **Chromatic** (all 12 against the tonic); labels are numbers or
  do-based solfège; the drone is the tonic, tonic + fifth, or the scale's I chord, with
  its own level. The note name sits beneath the degree behind a **third veil**.
- **Spelling** falls out of one rule: a 7-note scale's *k*-th tone is degree *k* with its
  offset from major as the accidental, so mode names reproduce themselves (Locrian ♭5,
  Lydian ♯4, Super Locrian 𝄫7) and the note name is spelled by its degree (the 7th of E
  is D♯, never E♭). Anything a scale can't spell uses the fixed `♭2 ♭3 ♯4 ♭6 ♭7` table.
  `docs/architecture/music-theory.md`.
- **The drone is independent of `stopCurrent()` by construction** — the engine's
  "new segment" call can't touch it, so it survives every segment and the rest between
  them, and `stop()` releases it explicitly. `docs/architecture/audio.md`.

**Decided against the spec, from the first listening session:**

- **Scale hides in Chromatic mode.** The spec kept it visible so out-of-key pitches could
  be spelled relative to the chosen scale; in practice a "C Major" dropdown that didn't
  govern the pool read as random wrong notes. Chromatic now has no scale at all.
- **The drone starts near the target's level** (baseline raised 6 dB, default 85/100).
  An octave-3 sine has to reach the target's level to register against it.
- **Key-aware note spelling was a listed non-goal and is done anyway** — "E♭" as the 7th
  of E major was the first thing a musician noticed.

**Not done, filed:** a tonal-center level independent of the drone (**#58**).

**Prerequisite that shipped separately:** **#59** — settings changes now replace the
pregenerated queue immediately. Without it, changing the key mid-session moved the
drone but left the queued degrees labeled against the old key; "fa" in C is not "fa"
in D.

## Practice-mode UI/UX overhaul (2026-09-07 – 2026-09-19)

A pass over the Chords & Scales / Pure Tone practice experience. The display competed
for weight with a wall of settings, a few controls sat far from what they affected, and
border treatments, disclosure arrows and "select all" placement had drifted apart
piecemeal.

Every piece was settled from a **rendered comparison** rather than a written
description — typefaces, chair motifs, PiP placement, glyph pairs, queue treatments.

### The display became the player

- **#22** — Display prominence, and a scroll-triggered PiP mini console. Subsumed
  **#31**: the chosen treatment drops the card's drop shadow for a real border, which is
  what that issue asked for.
- **#23** — Show current/next toggles moved into the display, renamed
  `TonalCenterVisibilityToggles`. Grew in scope: the **Start/Stop transport moved into
  the display too**, which the issue never said. Pause was split out to **#34**.
- **#24** — Idle state: a chair illustration and a worked example built from the live
  classes, so it can't drift from what a session actually looks like. Its
  `reading` → `card` rename became `reading` → **`readout`**, since "card" had come to
  mean the display sleeve itself.
- **#45** — The console now docks when **idle** as well as running, with a play key, and
  its ✕ became one swapping ▶/■ key. Measuring first showed the console is now a
  **phone feature** — since #27 shortened the page it never docks on a laptop, and never
  on Pure Tone at all. That table is in `randomizer.md`; don't pad a page to force a dock.

### Settings got a shape

- **#25** — Advanced disclosure arrow reflects open/closed state.
- **#26** — Custom bank collapsed behind `<details>`, renamed **"Custom chord bank"**
  (it only parses chords) and given an Apply button plus Enter-to-apply; committing had
  been blur-only.
- **#28** — Fieldset headers: brackets dropped, select-all stacked below the legend,
  items indented.
- **#29** — Every settings group became the same collapsible bordered box. Grew past
  "one border treatment": the previously-anonymous mode cards got the name **"Tonal
  centers"**, and Pure Tone's Roots picker moved into its Notes group.
- **#27** — Settings rebalanced into two columns, player controls against tonal-center
  pickers. Replaced #22's gatefold, which left a tall void under the display. The even
  split is a **measurement, not a preference** — Timing's Tempo row needs 394px.
- **#40** — Timing group internals rebuilt (captioned blocks, toggles that hold position,
  numeric bounds that bind). Landed mid-initiative without being part of it.

### Seeing further ahead

- **#20** — A stacked queue of up to four upcoming tonal centers, replacing the single
  "Next". Chosen from four rendered treatments (`docs/design/queue-stack/`). Every entry
  is the same size; depth is carried by saturation. Decided three things the issue left
  open: depth is a **separate setting from the veil**, repeat avoidance stays **strictly
  adjacent**, and depth applies **uniformly to both tabs**.

### Foundations

- **#21** — The Musical Chairs visual design language: chair motifs, colour, type. Spec
  in `docs/architecture/design-language.md`, working material in
  `docs/design/chair-motif/`.

### Not done, on purpose

- **#30** — A visual cue marking the tonal-center change. Explored over three rounds and
  **closed won't-do**: the moment is already marked twice, by the beat track resetting
  and by the metronome's accented click on that same beat. The comparison sheet and full
  reasoning are kept in `docs/design/transition-cue/` — read it before re-proposing this.
  Two findings there outlived the feature: the accented click already lands on the
  downbeat of each new tonal center, and light-mode `--brass` is a deep olive for a
  documented reason.

## Earlier

- **#16** — Light/dark theme support (`docs/architecture/theming.md`).
- **#6**, **#7** — Multi-mode navigation with separate practice tabs, and the "Pure Tone"
  tab reviving Root Notes in isolation.
- **#12**, **#13** — Roots picker moved to the top of Advanced settings; Beginner preset
  narrowed to major/minor triads on natural roots.
- **#9**, **#10** — Vitest scaffolded for `src/music/`; Vercel Analytics added.
