# Design language (`src/index.css`, `src/components/Chair.jsx`)

The visual identity: a hand-drawn chair motif and a variable display typeface. This is
the spec — what the language *is* and the rules that keep it coherent. The working
material behind it (the generator, reference sketches, the comparison sheet every
decision was made against) lives in `docs/design/chair-motif/`.

Established in issue #21, deliberately ahead of the screens that consume it (#22, #24),
so each one applies a decided language rather than improvising its own.

## What supersedes what

The palette began life as "a record sleeve at rest on a dark table." The app's name and
that imagery are both gone — the spinning-record badges went in 585ad22 — and Musical
Chairs replaces it. **The palette hexes did not change**; only the story about them did.
`--ink`, `--panel`, `--paper`, `--cobalt`, `--brass`, `--flame` are exactly what they
were.

## Typography

`--font-display` is **Fraunces**, a variable serif with four axes: optical size
(9–144), weight (100–900), softness (0–100), and `WONK` (0–1, which swaps in quirky
alternates — a cocked *a*, a slanted *g*).

One setting cannot serve every place the display face appears, so the axis values are
named per role and applied per selector:

| Token | Used by | Values |
|---|---|---|
| `--fvs-wordmark` | `.masthead h1` | opsz 60, wght 500, SOFT 40, WONK 1 |
| `--fvs-readout` | `.chord-name`, `.beat-numeral-current` | opsz 90, wght 300, SOFT 70, WONK 1 |
| `--fvs-ui` | `.transport-button` | opsz 40, wght 400, SOFT 50, WONK 1 |
| `--fvs-tiny` | `.beat-numeral-total` | opsz 14, wght 500, SOFT 50, WONK 1 |

**Optical size must track the size the glyph is rendered at.** This is the rule that
makes the table necessary, and getting it wrong is not subtle: `.beat-numeral-total` is
1.1rem, and inheriting the readout's opsz 90 — hairlines drawn for ~90px display type —
made it dissolve below a device pixel. It reads at opsz 14. Any new small display-size
text needs `--fvs-tiny` or its own low-opsz value, not whatever it inherits.

The wordmark stays `text-transform: uppercase`. That does mean the WONK axis is largely
wasted there (the wonk lives in the lowercase), which was a deliberate trade for the
sturdier all-caps lockup.

Body text (`--font-body`, Work Sans) and data/labels (`--font-mono`, Space Mono) are
unchanged. Notably the small uppercase legends — `TIMING`, `SOUND`, `PRESETS` — are mono
in `--brass`, *not* display type, so the typeface swap doesn't reach them.

**That brass mono legend is the settings-group marker** (issue #29). Every top-level
group in the settings column is named by one, including the collapsible ones, where the
legend *is* the `<summary>` — the group's name and its disclosure control are the same
element. Two groups (Advanced settings, Custom chord bank) once used a dimmer
sentence-case treatment instead, from when they were the only collapsible ones; that
split disappeared when every group became collapsible. Don't reintroduce a second header
style for a subset of groups — a group that opens is not a different kind of thing from
one that doesn't, it just starts closed.

## The chair motif

Three chairs, each a complete drawing with its accent already baked in:

| Pose | Accent | Meaning |
|---|---|---|
| `upright` | cobalt | at rest |
| `tipping` | brass | running |
| `fallen` | flame | none — illustration only |

Only two poses carry meaning, because the app has two states, not three. `fallen` exists
for composition; don't invent a state for it.

**Accent colour on a chair means nothing.** `--cobalt`, `--brass` and `--flame` already
mean triads / sevenths / extended, and flame doubles as "primary action." A chair's
colour is chosen for the surface it sits on. Loading a third meaning onto those three
was considered and rejected — it would collide with a code the mode blocks already use.

### Rules for placing one

- **Never recolour the frame per theme.** Frame paths use `currentColor`, so a chair
  inherits its container's `color` and flips cream/near-black on its own. A chair that
  needs a per-theme rule is a chair placed wrong.
- **Accents stay `var()` references, never hex.** `--brass` forks per theme
  (`#ce9b2e` → `#8a6412`) because it reads washed-out on the cream ground; a baked hex
  loses that. This is why `chairArt.js` stores `fill: "var(--brass)"` as a string.
- **Pose rotation belongs to the drawing** (in `Chair.jsx`); spacing between chairs is
  contextual and belongs to the consuming stylesheet.
- **Decorative by default.** `Chair` renders `aria-hidden` unless given a `label`. In
  the masthead the wordmark beside it already names the app.

### Where they are

| Placement | Pose | Note |
|---|---|---|
| Masthead lockup | upright, tipping, fallen | The identity mark: at rest, running, and one for composition. |
| Idle display card | upright | The hero of the idle state (#24). |
| Foot of Advanced settings | fallen | Faint and right-aligned, inside a panel that starts closed — found rather than presented. |

The last one is deliberately the only chair you have to go looking for, and it only
exists on the Chords & Scales tab, since Pure Tone has no Advanced panel.

### Two constraints that will bite

**A chair rotated past roughly 80° stops reading as a chair** — it collapses into an
unrecognisable bracket. `fallen` is 72°. If you add a pose, check it at final size.

**A CSS rotation moves the ink but not the layout box.** A rotated chair therefore sits
optically off-centre in a row even when the elements are evenly spaced, and it reads
smaller than its box (the fallen chair is drawn larger to compensate). The masthead's
corrections in `App.css` are optical, and they need *two* adjustments rather than one:
widening the middle chair's left margin also pushes the third chair right by the same
amount, so the right-hand gap has to be reopened separately. Measure with `getBBox()`
mapped through `getScreenCTM()`; eyeballing this does not converge.

## Artwork provenance

`src/components/chairArt.js` is generated, not hand-written. Every mark is a **filled
ribbon** — a centreline offset by a half-width that varies along its length — rather
than a stroked path, because a uniform `stroke-width` cannot swell or taper and always
reads mechanical no matter how much noise is added to it.

To redraw:

```sh
cd docs/design/chair-motif
node chair-generator.mjs --bake
```

Seeds are recorded per chair, so a rebuild reproduces the exact artwork rather than
rolling a new hand. `docs/design/chair-motif/README.md` has the full parameter set, the
ten variations explored, and the reference sketches.
