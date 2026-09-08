# Transition cue — rejected

**Outcome: not doing this.** Issue
[#30](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/30) — a visual
cue marking the moment the tonal center changes — was explored over three rounds and
closed as won't-do. It added visual noise without adding information.

This folder is kept so the next person to have the idea can read why it was dropped
instead of rebuilding the comparison. None of it ships or runs at build time.

## Why it was rejected

The change is **already marked twice**, and a third signal was decoration:

- The beat track resets to position 1.
- The metronome plays an **accented click** (C6, louder) on that exact beat — see "the
  accent already exists" below.

Everything below is the reasoning that got there, kept because the individual findings
outlived the feature.

## What's here

| File | What it's for |
|---|---|
| `specimen.html` | The comparison sheet, at its final state (round 3). Four display cards on one shared clock, plus an off-beat-gold control for light mode. Open it in a browser. |

It reproduces the real display card: the app's tokens copied verbatim from `src/index.css`,
the same Fraunces readout, the same beat track. Controls: tempo, beats per tonal center,
rest between tones, theme, listening mode (veil), off-beat gold, and a simulation of
`prefers-reduced-motion`.

## Round 1 — cues on the chord name. Rejected.

**Settle** (fade + rise), **Lift** (Settle plus scale and overshoot), **Strike** (a flame
twin of the name fading out over it), **Flare** (a flame wash blooming across the card).
All four rejected, and the direction with them — **no accent on the chord name.**

## Round 2 — colour the beat blocks. Rejected.

Mark the first beat of a tonal center by filling its block differently from the rest of the
span:

| | Beat 1 | Rest of span | Past blocks |
|---|---|---|---|
| Baseline (today) | flame | flame | `--paper-medium` |
| Downbeat flame | flame | gold | `--paper-medium` |
| Downbeat brass | gold | flame | `--paper-medium` |
| Coloured trail | flame | gold | keep their colour, dimmed |

Cheap — `.beat-block` already swaps classes and transitions `background`/`border-color`
every beat, so this changed *which* token filled a block, not how often or how expensively.
Cheap wasn't enough.

## Round 3 — numeral follows the block. Rejected with the rest.

The numeral takes the colour of the block it is counting, so "3" and the third square are
never two different colours.

## Findings worth keeping

### There is a real (small) bug in the app

**During a rest, the beat block goes cobalt while the numeral stays flame.** They disagree.
This was found while building round 3 and is *not* dependent on any of the rejected work —
`.beat-numeral-current` is hard-coded to `var(--flame)` in `App.css` while
`.beat-block--current.beat-block--gap` switches to cobalt. Worth fixing on its own terms.

### The accent already exists, in audio

`useRandomizer` plays an accented metronome click (C6, louder) on the beat boundary where a
phase ends — which is the same instant `advanceToNext` sets `beatIndex` to 1 and attacks the
new chord. The parameter is named `phaseEnding` for the phase it closes, but it sounds on the
*first beat of the new tonal center*. This is most of the argument for rejecting #30: the
downbeat is already accented, just not visually.

### Light-mode brass is deep for a reason, and it constrains anything text-shaped

`theming.md` records that `--brass` forks per theme (`#ce9b2e` → `#8a6412`) because the
bright gold reads as washed-out text on a light page — *"small uppercase labels (TIMING,
SOUND, PRESETS…) especially."* That deep olive is correct for those legends and reads as
muddy anywhere it's used as a fill.

A filled block has no meaningful contrast requirement; a numeral does. Any future design
pairing the two inherits the numeral's contrast floor — though that floor is **3:1** (large
display type), not the 4.5:1 the small labels need:

| Option | Hex | On white | Numeral (3:1) | Small label (4.5:1) |
|---|---|---|---|---|
| Deep — today's `--brass` | `#8a6412` | 5.37:1 | passes | passes |
| Mid | `#a87716` | 3.95:1 | passes | fails |
| Bright — dark mode's `--brass` | `#ce9b2e` | 2.51:1 | fails | fails |

### Why light mode reads flatter than dark, generally

Dark mode puts a bright gold and a bright flame on a dark panel: both advance, differing
mostly in hue. Light mode puts two dark-ish colours on white: both recede, and they differ
in *lightness* as well as hue, so the pair reads as "dark and darker" rather than "two
accents." This applies to any future two-accent pairing, not just this one.

### Compositor-only, for anything beat-synced

The moment a cue would fire is the same beat boundary where Tone.js schedules the next
chord's attack. `randomizer.md` already bans `box-shadow`, `filter` and `blur` from
beat-synced visuals; that ruled out the obvious "glow" in round 1 and would rule it out
again.

## Links

- Issue: [#30](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/30) (closed, won't-do)
- Build order for the wider initiative: `docs/ui-ux-overhaul.md`
- Why the display works the way it does: `docs/architecture/randomizer.md`
