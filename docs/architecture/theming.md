# Theming (`src/index.css`, `src/hooks/useSettings.js`)

`settings.theme` is `'system' | 'light' | 'dark'` (issue #16), synced onto
`<html data-theme="...">` by a `useEffect` in `useSettings.js` — `'system'` removes the
attribute entirely rather than setting it to `''`, so the CSS falls through to
`prefers-color-scheme` with nothing overriding it. `ThemeToggle.jsx` is the only UI for
it, in the masthead (global to the whole app, not per-tab).

## Why dark is the token baseline, not light

Most theme-aware CSS treats light as the default and layers dark on top (bare `:root` =
light, `@media (prefers-color-scheme: dark)` overrides it). This app inverts that:
dark is the bare `:root` baseline, since that's the app's original, established look
("a record sleeve at rest on a dark table") — a real product identity, not an arbitrary
starting point. Light is layered on via `@media (prefers-color-scheme: light)`, guarded
with `:root:not([data-theme="dark"])` so an explicit dark choice always beats a
light-OS preference, and `:root[data-theme="light"]` forces light regardless of OS. The
logic is the mirror image of the usual pattern, not a variation on it — get the guard
direction backwards and an explicit choice silently loses to the OS preference.

## Token roles vs. token values

`--ink` and `--paper` are named for their *dark-mode* values (a paper color, an ink
color) but their actual role in every rule that uses them is positional: `--ink` means
"page background," `--paper` means "foreground text/outline," full stop — nothing reads
either token expecting a specific hex. That's what makes the light theme cheap: it
reuses the exact same two colors with the roles' *values* swapped (`--ink` becomes the
light one, `--paper` becomes the dark one) rather than inventing a new palette.
`--paper-dim`/`--paper-faint`/`--paper-medium` (translucent tiers of the foreground
color, for secondary text and hairline borders) get redefined alongside it, rebased on
whichever hex `--paper` holds in that theme.

`--panel` (card surface) and `--vinyl` (the record disc badge) aren't part of that
flip: `--panel` gets its own light-mode value (white, rather than "a shade lighter than
ink" the way dark mode's panel is — plain white read better against a warm cream page
than a tinted-cream card would), and `--vinyl` never changes at all — the disc itself is
always black vinyl regardless of what theme is looking at it.

`--cobalt`/`--brass`/`--flame` (the three difficulty-tier accents) keep the same hex in
both themes, with one exception: `--brass` is darkened for light mode
(`#ce9b2e` → `#8a6412`). At its dark-mode value it's a bright gold that reads as
washed-out, low-contrast text on a light background — small uppercase labels
(`TIMING`, `SOUND`, `PRESETS`, …) especially. Cobalt and flame stay unchanged; they're
dark enough already to hold up as text on a light page.

## `.mode-block.is-on`'s light-mode-only override

The three core-mode blocks' *active* state sets a colored background per mode
(cobalt/brass/flame) with a text color chosen for contrast against that specific
background: cobalt and flame are dark enough that cream (`--paper` in dark mode) text
reads well; brass is bright enough (in dark mode) that dark ink (`--ink` in dark mode)
text is the one that reads well there instead. That's a real, deliberate,
per-background choice — not an oversight to unify.

Naively carrying that same `--paper`/`--ink` split into light mode breaks it: `--paper`
now means "dark text," so triads and extended flip to dark text on their still-medium
cobalt/flame backgrounds (poor contrast), while sevenths flips to light text on its
now-darkened brass background (which is now the one combination that actually wants
light text). The fix isn't to swap which block uses which token — it's that cobalt and
flame don't change brightness between themes, so their text color shouldn't either.
`--cream` is a third, fixed-value token (never redefined by any theme block) for exactly
this: a light neutral for text on a saturated fill, independent of what "foreground
text color" currently means. A light-mode-only rule (`:root:not([data-theme="dark"])
.mode-block.is-on` / `:root[data-theme="light"] .mode-block.is-on`) overrides just the
`color` to `--cream` for all three blocks at once, while dark mode's original
per-variant rules — genuinely correct there — are left untouched.
