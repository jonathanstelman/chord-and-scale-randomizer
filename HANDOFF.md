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

## 8. Sound cleanup + drop Root Notes from the randomizer — done

Not originally on this list — came up as three related complaints: Chord and Pad sounded
redundant (Pad was the more pleasant of the two), the arpeggio sounded harsh and
staccato, and Root Notes mode wasn't earning its place in a beginner's ear-training
practice. Shipped in `audio/engine.js`/`music/pool.js`/`music/chordQualities.js`:
- **Chord/Pad merge**: the old fast-attack chord synth is gone; the pad's sine-based
  synth is now what plays for `soundType: 'chord'`. The sound select is now
  `'chord' | 'arpeggio' | 'none'`.
- **Harp-style arpeggio**: sine oscillator, slower attack (0.03s vs. the old 0.005s), and
  longer decay/release (0.35s/0.4s vs. 0.12s/0.12s) so notes ring into each other instead
  of cutting off hard, plus an actual up/down bounce through the chord tones
  (`0..n-1..0`, period `2*(n-1)`) rather than an ascending-only cycle that snapped
  straight back to the bottom on every lap.
- **Root Notes removed from the randomizer's mode row** (`CORE_MODES` is now three
  tiers: Triads, Sevenths, Extended) — but see #9-#11 below: it wasn't retired as a
  skill, just relocated. The reasoning, worth preserving since it drove the redesign:
  `CHORD_QUALITIES`'s old `{ key: 'root', intervals: [0] }` entry modeled "no harmonic
  content" as a degenerate point on the *same axis* as "increasingly rich harmonic
  content" (reusing `hasKeySignature`, the mode-row ladder, the "F# Root Note" answer
  format), but a bare pitch has no *type* to identify — it's a different skill
  (instrument-geography / pitch-finding) that this app's "spot what changed" format was
  never built to score. The old Beginner preset (Root + Triads together) was quietly
  conflating the two; Beginner is now Triads-only.

## 9. Multi-mode navigation: separate practice tabs (prerequisite for #10, #11)

Right now `App.jsx` renders exactly one screen — the chord/scale randomizer. #10 and #11
below are deliberately *not* new modes bolted onto that randomizer (see #8's reasoning on
why Root Notes doesn't belong there); they're separate exercises with their own settings
and interaction model, aimed at making this one app useful to music students at very
different stages rather than just this one randomizer's target level. This item is the
shared prerequisite: some way to move between practice modes as actual tabs, not more
checkboxes in one settings panel.

Open questions to resolve before building:
- **Navigation mechanism**: plain in-app tab state (an `activeTab` piece of state in
  `App.jsx`, no URL change — simplest, matches this app's current no-router, no-backend,
  single-`index.html` shape) vs. real routes (e.g. `/`, `/pitch`, `/reference-tone`) via a
  client-side router (React Router or similar), which would let each mode be
  bookmarked/shared directly but adds its own history/back-button behavior to reason
  about. Given the zero-backend static Vercel deploy, routing is easy to add but isn't
  free — worth deciding how much "shareable per-mode URL" is actually worth against the
  complexity of introducing routing to a codebase that's never needed it.
- **Shared vs. independent settings**: `useSettings.js` currently persists one flat
  object to `localStorage` for the one existing mode. Do the new tabs share anything with
  it (tempo, metronome volume/on-off, roots filter) or does each own its settings
  independently under its own storage key? A shared "global" subset plus per-mode
  overrides is probably the right shape, but it's a real design decision —
  `loadSettings()`/`DEFAULT_SETTINGS` would need restructuring either way.
- The existing chord/scale randomizer becomes one tab among several (presumably the
  default/first one) — otherwise unchanged.

## 10. "Pure Tone" practice tab — revived Root Notes, isolated

The single-pitch practice that used to live inside the randomizer (see #8), rebuilt as
its own tab rather than a mode/preset: play one random pitch on a timer, no chord/scale
context, and the "answer" is just the pitch's name — closer to a note-finding/
instrument-geography drill than harmonic ear training.
- Likely doesn't need a new state machine: `useRandomizer.js`'s beat/gap/duration/sound
  scheduling is already generic (the custom-bank work in #4 proved out swapping the
  "what's next" source without touching the clock), so this could plug in a source that
  always returns a single root pitch class from `ALL_ROOTS`/`notes.js` — no
  `CHORD_QUALITIES`/`SCALE_TYPES` involved at all, since there's no "type."
- The settings surface should shrink accordingly: tempo/duration/gap/roots-filter still
  apply, but no sound-type select (always just a note — no chord/arpeggio choice to
  make), no density field (always 1 note), no mode/type checkboxes (there's no type to
  enable/disable).

## 11. "Reference Tone" practice tab — functional ear training

A materially bigger, separately-designed feature — flagged in the same conversation as
#10 but not the same shape of work, so scoping it in detail is its own future session's
job. The idea: establish a tonic/drone, then play a second note as a scale degree
relative to it, and ask the student to identify the *scale degree* (e.g. "5", "♭3" —
solfège vs. scale-degree numbers is a user-facing decision, TBD) rather than an absolute
pitch name. Closer to how apps like Functional Ear Trainer work, and arguably the more
legitimate version of "beginner ear training" than either the old Root Notes mode or
#10's pitch-finding drill, since it trains hearing relative to a key rather than naming
an isolated absolute pitch.
- Needs a sustained/looped drone tone running underneath a second, foreground note — a
  new audio-engine capability (`engine.js` currently only ever plays one thing at a time,
  held or arpeggiated; nothing loops in the background while another sound plays over
  it).
- Needs a scale-degree-to-name mapping and a decision about which scale/mode the degrees
  are drawn from (a fixed major scale to start? tie it to the existing `SCALE_TYPES` so
  minor/modal variants are selectable later?).
- Whether it shares any code with #10 (both are "play something, ask what it was" against
  a beat clock) or is different enough to be its own thing end-to-end is itself an open
  question once scoping starts.
