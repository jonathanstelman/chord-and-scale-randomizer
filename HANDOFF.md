# HANDOFF.md

Notes and to-dos for whoever (human or Claude) picks this up next. See `README.md` for
what the app does today and `CLAUDE.md` for architecture/gotchas — this file is just the
punch list of what's left.

## 1. Polish the UI — group timing/tempo controls

`src/components/Controls.jsx`'s `.session-data` row currently lists Tempo, Min, Max,
Gap, Sound, Density as six flat, undifferentiated fields. Tempo/Min/Max/Gap are all
"when things change" controls; Sound/Density are "what it sounds like." Group them
visually (two sub-rows or two labeled clusters) so the relationship reads at a glance
instead of requiring the field labels to do all the work.

## 2. Simpler default layout — hide conditional controls until needed

Min/Max/Gap are visible unconditionally today, but most sessions probably want a single
duration (min = max) and no gap at all. Consider:
- A single "Duration" field by default, with a "use a range" toggle that reveals
  separate Min/Max only when turned on.
- Gap defaulting to hidden, with an explicit "add a pause between chords" toggle that
  reveals the beats-of-silence field — rather than a `0` sitting in a visible field all
  the time.

There's already a working precedent for this pattern in the same file: the
`<details className="advanced">` disclosure that hides the full per-type checkbox list
behind "Advanced settings." Same idea, applied to the timing fields.

## 3. Explicit levels/modes with presets

Right now there are four difficulty tiers (`CORE_MODES` in `src/music/pool.js`: Root,
Triads, Sevenths, Extended) that the user assembles manually via checkboxes — there's no
one-click "Beginner" or "Chords only" / "Scales only" preset. Worth adding a small set of
named presets (e.g. Beginner = Root + Triads at a slow tempo, Chords Only = Triads +
Sevenths, Scales Only = Extended) that set `enabledTypes` (and maybe `bpm`) in one click,
leaving the manual checkboxes as the "customize from here" path underneath. `setModeEnabled`
in `src/hooks/useSettings.js` already does the "turn on every type in a category" plumbing
this would build on.

## 4. Custom chord/sequence bank

Let a user type in their own set of tonal centers — e.g. the actual changes to a song —
and have the randomizer draw only from that set, or step through it in order instead of
randomly. This is the biggest item here; some open questions to resolve before building:
- **Input format**: free-text chord symbols ("Cmaj7 Dm7 G7 Cmaj7") need a parser (root +
  quality, at minimum); a structured builder (pick root + quality from dropdowns, add to
  a list) is slower to build but needs no parsing and reuses `CHORD_QUALITIES`/
  `SCALE_TYPES` from `src/music/` directly.
- **Ordered vs. random**: a real song's progression has a fixed order. The current
  randomizer (`useRandomizer.js`) always picks randomly with a no-repeat guarantee — it'd
  need a second mode that just walks the custom list in sequence (with the same
  gap/duration/sound machinery, just a different "what's next" source instead of
  `pickRandomTonalCenter`).
- **Where it plugs in**: `pool.js`'s `pickRandomTonalCenter(enabledKeys)` and
  `useRandomizer.js`'s `makeSegment` are the two places that would need a custom-bank
  source instead of (or blended with) `ALL_TONAL_CENTER_TYPES`.

## 5. Prepare for Vercel deployment — done

Deployed 2026-08-31. Repo renamed to match the app's actual name
(`chord-and-scale-randomizer`, per `package.json`/README) and pushed to
`github.com/jonathanstelman/chord-and-scale-randomizer`; Vercel auto-detected Vite
(`npm run build` / `dist/`) with zero config changes needed. Post-deploy audio sanity
check (`Tone.start()` needing a user gesture) passed live.
