# Queue stack — how the treatment was chosen

Working material behind issue
[#20](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/20), the
stacked queue of upcoming tonal centers. Nothing here ships or runs at build time; it
exists so the queue's look can be *changed* without redoing the comparison.

The shipped behaviour and its reasoning live in
[`docs/architecture/randomizer.md`](../../architecture/randomizer.md)'s "Queue depth" —
read that first. This file only records what was compared and what was set aside.

## What's here

| File | What it's for |
|---|---|
| `specimen.html` | The comparison sheet. Four treatments on one shared clock in the real display card, with controls for depth, entry size, the depth ramp, position numerals, long names, narrow width and theme. Open it in a browser. |

It reproduces the display card rather than describing it: the app's tokens copied
verbatim from `src/index.css`, the same Fraunces readout, the same beat track.

## The four treatments

- **A — Column.** The existing right-hand `Next` slot grown downward. **Chosen.**
- **B — Rail.** A lane under the readout, entries spread across the card in equal
  columns. Set aside: at depth 4 each entry gets ~10rem, so real scale names ("A Altered
  (Super Locrian)") ellipsize. Horizontal room is what the card has spare, but not this
  much of it.
- **C — Chips.** The literal Tetris next-piece queue, each entry boxed. Set aside: four
  more rectangles on a card that is flat by decision (#31), and the third and fourth
  chips' borders fall below visibility at the token ramp anyway.
- **D — Run-in.** One quiet line under the readout, entries separated by middots.
  Included as the control — if four names read fine as a sentence, a stack is costing
  layout for nothing. They don't, at speed.

## What the sheet settled

- **Entry size 1.4rem**, every entry the same. #22 had deliberately left
  `.chord-name--next` untuned for this issue.
- **No position numerals.** Stack position already says how far ahead an entry is; the
  numerals were rendered and read as clutter.
- **The Tokens depth ramp** (`--paper` / `--paper-dim` / `--paper-medium` /
  `--paper-faint`), keeping the queue on the app's own tiers.

## The one thing to re-open first

**`--paper-faint` is 0.14 alpha, and the fourth entry is marginal at it** — more so in
light mode, where the dimmed tiers sit on a light ground. It was chosen with that known,
in preference to inventing a ramp.

The alternative is already drawn: the sheet's **Compressed** ramp (1 / .74 / .55 / .40)
keeps all four legible and still recedes. Toggle between them with Depth at 4 and Long
names on, in both themes, before changing anything — that's the comparison the decision
came from.
