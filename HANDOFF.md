# HANDOFF.md

Notes and to-dos for whoever (human or Claude) picks this up next. See `README.md` for
what the app does today and `CLAUDE.md` for architecture/gotchas — this file is just the
punch list of what's left.

## 1. Polish the UI — group timing/tempo controls — done

`src/components/Controls.jsx`'s `.session-data` row currently lists Tempo, Min, Max,
Gap, Sound, Density as six flat, undifferentiated fields. Tempo/Min/Max/Gap are all
"when things change" controls; Sound/Density are "what it sounds like." Group them
visually (two sub-rows or two labeled clusters) so the relationship reads at a glance
instead of requiring the field labels to do all the work.

Shipped: `.session-data` split into "Timing" and "Sound" labeled clusters (same
brass-legend style as the Advanced panel's category headers) in `Controls.jsx`/`App.css`.

## 2. Simpler default layout — hide conditional controls until needed — done

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

Shipped: Min/Max collapse into a single "Duration" field by default (`minBeats` ===
`maxBeats` in `useSettings.js`'s defaults), revealed via a "Randomize beats" checkbox;
Gap hidden behind an "Add a pause between chords" checkbox. Both toggles derive their
initial expanded/collapsed state from whatever was already persisted, so an existing
range/gap reopens expanded rather than silently hiding data.

## 3. Explicit levels/modes with presets — done

Right now there are four difficulty tiers (`CORE_MODES` in `src/music/pool.js`: Root,
Triads, Sevenths, Extended) that the user assembles manually via checkboxes — there's no
one-click "Beginner" or "Chords only" / "Scales only" preset. Worth adding a small set of
named presets (e.g. Beginner = Root + Triads at a slow tempo, Chords Only = Triads +
Sevenths, Scales Only = Extended) that set `enabledTypes` (and maybe `bpm`) in one click,
leaving the manual checkboxes as the "customize from here" path underneath. `setModeEnabled`
in `src/hooks/useSettings.js` already does the "turn on every type in a category" plumbing
this would build on.

Shipped: `PRESETS` in `pool.js` (Beginner, Chords Only, Scales Only, Everything, plus
Guitar — see #6) and `applyPreset` in `useSettings.js`, replacing `enabledTypes` (and
`bpm`, for Beginner) outright. One-click pill buttons sit above the mode-row in
`Controls.jsx`; the manual checkboxes remain the "customize from here" path underneath.

## 4. Custom chord/sequence bank — done

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

Shipped: free-text parser (`src/music/chordParser.js`), comma/newline-separated, matched
against `CHORD_QUALITIES` — accepts the common alternate spellings (`Em`/`E-`/`E min` all
read as E minor; `Dm7`/`CM7` resolve correctly, case only mattering for that one
genuinely ambiguous pair). Both random and ordered modes ship — ordered walks the list by
index (`tonalCenterAtIndex` in `pool.js`) and skips the repeat-avoidance loop entirely,
since a repeated chord in a typed-out progression is intentional. A "Custom bank" panel
in `Controls.jsx` shows either a parsed-chord confirmation or a red error box naming the
exact token(s) that failed; a failed parse keeps the last good bank rather than blanking
playback. Mutually exclusive with Guitar mode and the general filters — any manual
checkbox edit exits it, same rule as #6 below.

## 5. Prepare for Vercel deployment — done

Deployed 2026-08-31. Repo renamed to match the app's actual name
(`chord-and-scale-randomizer`, per `package.json`/README) and pushed to
`github.com/jonathanstelman/chord-and-scale-randomizer`; Vercel auto-detected Vite
(`npm run build` / `dist/`) with zero config changes needed. Post-deploy audio sanity
check (`Tone.start()` needing a user gesture) passed live.

## 6. Guitar mode — done

Not originally on this list — came up as "can we source only common beginner guitar
chords (C, G, D, E, A + their minors)?" Answering it needed a new filtering dimension
this app didn't have: restricting which *roots* are in play, not just which chord/scale
*types*. Two things shipped:
- A general, reusable **root filter**: `enabledRoots` in `useSettings.js`, exposed as a
  "Roots" section in the Advanced panel (`rootsCheckState`/`toggleRoot`/
  `setAllRootsEnabled`), intersected with each type's key-signature-valid roots in
  `pickRandomTonalCenter` (`pool.js`).
- A **Guitar preset** drawing from an explicit 8-chord list
  (`GUITAR_OPEN_CHORD_PAIRS` in `pool.js`: C/G/D/E/A major + Am/Dm/Em minor) rather than
  composed from the root filter above — the real open-chord set is asymmetric (no
  Cm/Gm, since those aren't open-position shapes), which a uniform "these roots" ×
  "these qualities" filter can't express. Mutually exclusive with the general filters and
  the custom bank (#4): any manual checkbox edit, or another preset, exits it.

## 7. iPad/Safari: sound doesn't play — done, unverified on real hardware

Reported 2026-08-31 against the live Vercel deploy: the sound generator didn't produce
audio on an iPad, per limited testing. Diagnosed same-day: it's the iOS mute switch
(hardware or the Control Center software toggle) — confirmed by the same behavior on the
reporter's iPhone. This is a documented WebKit behavior, not a bug in the audio math:
iOS puts a page's raw Web Audio API output in the "Ambient" session category by default,
which respects the mute switch, while native `<audio>`/`<video>` elements get
"MediaPlayback" and ignore it — which is exactly why most other browser-based synth/audio
apps don't seem to obey the switch, and this one did.

Shipped in `audio/engine.js`: `unlockIOSMediaPlayback()` routes the limiter's output
through a hidden `<audio>` element (via a `MediaStreamAudioDestinationNode`) instead of
straight to `AudioContext.destination`, bumping the page into "MediaPlayback" so the mute
switch stops applying — matching how the apps that already worked correctly behave.
Gated to iOS specifically (`IS_IOS`, UA sniffing + a touch-points check for iPadOS 13+'s
default "MacIntel" UA masquerade) so desktop keeps the original direct, lower-latency
`.toDestination()` path; called synchronously as the first line of `useRandomizer.js`'s
`start()`, since `<audio>.play()` needs the same live user gesture `Tone.start()` does.

Verified: lint clean, and via Playwright with a spoofed iPad UA — `IS_IOS` correctly
true/false across a real iPad UA, an iPadOS-as-"MacIntel" UA, and a real Mac (excluded);
the hidden `<audio>` element gets created and is actively playing a live MediaStream when
a session starts; desktop path untouched (no `<audio>` element, same `.toDestination()`
call). **Not yet confirmed against real iPadOS/Safari** — Playwright's engine is
Chromium, not WebKit, so it can't verify the actual mute-switch-bypass behavior itself,
only that the audio graph is wired up correctly and nothing throws. Needs a real-device
check on the next deploy.
