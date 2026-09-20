# Changelog

What shipped, newest first. Issue numbers link to the reasoning; the *why* behind a
subsystem's design lives in [`docs/architecture/`](./docs/architecture/README.md), and
the working material behind visual decisions lives in
[`docs/design/`](./docs/design/).

This is a note of what changed, not a release log — the app deploys from `main` and has
no versions.

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
