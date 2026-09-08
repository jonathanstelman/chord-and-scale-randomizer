# Chair motif — design source

Working material behind the Musical Chairs illustration motif (issue #21). None of this
ships or runs at build time. It exists so the motif can be *changed* later without
redoing the design conversation that produced it.

The shipped artwork lives in `src/components/Chair.jsx` as static path data baked from
`chair-generator.mjs`. If you only want to know what the motif *is*, read
`docs/architecture/design-language.md` instead — this file is the workshop, that one is
the spec.

## What's here

| File | What it's for |
|---|---|
| `chair-generator.mjs` | The generator the shipped chairs were baked from. Run it to redraw them. |
| `specimen.html` | The full comparison sheet used to make every decision. Open it in a browser. |
| `reference/sketch-1-three-chairs.jpg` | First pencil sketch — established the silhouette. |
| `reference/sketch-2-fat-strokes.jpg` | Second sketch — established the *line quality*, which is what the first attempt got wrong. |

## Using the generator

```sh
cd docs/design/chair-motif
node chair-generator.mjs --list                      # the ten variants and their parameters
node chair-generator.mjs --variant E1 --accent cobalt > chair.svg
node chair-generator.mjs --bake                      # the four shipped chairs, as JSON
```

`--bake` is what produced the path data in `Chair.jsx`. Re-run it and paste the result
back if you change a parameter.

## What was decided, and why

**Silhouette.** An oval/teardrop backrest floating above the seat on two thin stems, a
seat drawn as a quadrilateral in loose perspective, two front legs only. Traced from the
sketches rather than invented.

**Line quality is the whole thing.** The first attempt drew every line as a `<path>` with
a uniform `stroke-width`, then tried to make it look hand-drawn with a wobble filter. It
read as "too messy and too neat at the same time" — because a uniform stroke *cannot*
swell or taper, no amount of noise fixes it. Every mark is now a **filled ribbon**: a
centreline offset by a half-width that varies along its length (a taper plus two slow
out-of-phase swells). Closed shapes — seat, backrest — are drawn as even-odd annuli so
their outlines vary in weight too. See `ribbon()` and `ringMark()`.

**The seed is part of the design.** Which random hand drew a given chair is fixed by its
seed, recorded in `SHIPPED`. Rebuilding reproduces the exact artwork rather than rolling
a new one.

**Stem angle is an input, not an outcome.** Each stem is cast from the backrest at a
stated angle off the horizontal until it meets the seat's back edge, so the attachment
point is derived from the angle. `stemMode` decides which way the two lean: `splay`
spreads the feet, `converge` pulls them together, `rake` leans both the same way.

**Colour goes only in the backrest.** The frame is `currentColor`, so it renders cream on
the dark theme and near-black on the light one from identical markup, with no per-theme
rules of its own. Accents are passed as `var(--cobalt)` / `var(--brass)` / `var(--flame)`
rather than hex — `--brass` has a per-theme value (`#ce9b2e` → `#8a6412`) and a baked hex
would lose that fork.

**Accent colour carries no meaning.** Those three already mean triads / sevenths /
extended (and flame doubles as "primary action"). A chair's colour is chosen for the
surface it sits on; loading a third meaning onto them was rejected deliberately.

**Poses.** `upright` = at rest, `tipping` = running. `fallen` is illustration-only — the
app has two states, not three, so only two poses carry meaning.

### The shipped five

| Where | Variant | Accent | Pose |
|---|---|---|---|
| Masthead, 1st | E1 | cobalt | upright |
| Masthead, 2nd | E2 | brass | tipping |
| Masthead, 3rd | E6 | flame | fallen |
| Idle card (hero) | E1 | cobalt | upright |
| Foot of Advanced settings | E6 | flame | fallen, mirrored (`fallRight`) |

Drawn at weight `0.7`, jank `1`, shading off. Masthead arrangement is the "small
cluster": ~34px chairs (40px for the fallen one), tight spacing, sitting low.

## Traps, all of them hit at least once

- **Smoothing a quad through its four corners turns it into an oval.** Catmull-Rom needs
  points planted along each edge first (`subdivideClosed`) so it hugs the straight runs
  and rounds only the corners. The backrest is the opposite case — subdividing *it*
  produced a polygon, so it stays organic with a high `per`.
- **A chair rotated past ~80° stops reading as a chair.** It collapses into an
  unrecognisable bracket. `fallen` is 72°.
- **CSS rotation moves the ink but not the layout box.** The tipping chair throws its
  mass left inside its own box, which visibly closes the gap to its left-hand neighbour.
  The masthead's spacing corrections in `App.css` are optical, not layout — and they need
  *two* adjustments, since widening the middle chair's left margin also pushes the third
  chair right by the same amount. Measure with `getBBox()` mapped through each element's
  `getScreenCTM()`; eyeballing it will not converge.
- **A rotated chair reads smaller than its box**, so the fallen one gets a size bump.

## Links

- Issue: [#21](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/21)
- Build order for the wider initiative: `docs/ui-ux-overhaul.md`
- The interactive specimen sheet was also published as a Claude artifact during design;
  `specimen.html` here is the same page, self-contained.
