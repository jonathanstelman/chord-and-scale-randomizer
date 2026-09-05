# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs

- `docs/product.md` — vision, audience, core user flows, explicit out-of-scope
- `docs/guidelines.md` — conventions, testing approach
- [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) — active
  and planned work (backlog lives here, not in a markdown file)
- This file — architecture and gotchas (below)

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run lint` — oxlint (no test suite exists)

## Architecture

**Music theory is pure data, decoupled from audio/UI** (`src/music/`):
- `chordQualities.js` / `scaleFamilies.js` define the raw vocabulary (triads, sevenths,
  and scale-family modes with their step patterns). Scale modes are generated
  programmatically by rotating a parent scale's step pattern, not hand-written per mode.
- `pool.js` merges both into `ALL_TONAL_CENTER_TYPES` and does the actual randomization:
  `pickRandomTonalCenter` picks a root + type, respecting each type's `hasKeySignature`
  flag (major/minor/modal types are restricted to roots with a sane key signature — see
  `notes.js`'s circle-of-fifths spelling table — so you get "B♭" not "A♯"; symmetric
  scales/dim/aug aren't restricted since they don't imply a key).
- `notes.js` has two spellings per pitch class on purpose: `pitchClassToName`/
  `pitchClassToNoteName` stay ASCII ("Bb4") because that's all Tone.js's note parser
  accepts, while `pitchClassToDisplayName` swaps in the real Unicode glyphs (♭ ♯) for
  anything shown to the user. Don't collapse these into one function.
- `voicing.js` turns a root + interval list into actual voiced notes spread across
  octaves (root low, everything else stacked above), and separately
  `padToSimpleArpeggioLength` pads an arpeggio's note count up to 1/2/4/8 — the set of
  lengths that divide evenly into 8 32nd-notes per beat. This is load-bearing: it's what
  keeps the arpeggiator from drifting out of phase with the beat on chords whose note
  count isn't already a power of two (e.g. a 3-note triad).

**Audio** (`src/audio/engine.js`): `TonalCenterPlayer` owns every Tone.js node and
exposes a small imperative surface (`playSegment`, `click`, `tickArpeggio`,
`setMetronomeVolume`, `stopCurrent`, `dispose`). Two things here are deliberate, not
incidental:
- Gain staging: `PolySynth` doesn't reduce per-voice volume as more notes stack, so
  dense chords will clip without help. Volume is scaled per note-count
  (`-10*log10(n/4)`, a power-sum estimate) on top of a limiter used as a backstop, not
  the primary defense.
- The arpeggiator is **not** a `Tone.Sequence`. Constructing and starting a
  `Tone.Sequence`/`Part` from inside an already-running `Transport.scheduleRepeat`
  callback mis-schedules it in this Tone.js version (silently drops its first note, or
  fires it late); reassigning a live Sequence's `events` mid-flight has the same problem
  one step later. Instead, `tickArpeggio(time)` is called explicitly once per 32nd note
  from `useRandomizer`'s own clock and reads a plain note-array + step-counter — fully
  deterministic, no hidden rescheduling. Don't "simplify" this back to a Sequence.
- The arpeggio walks notes in an up/down bounce (`0..n-1..0`, period `2*(n-1)`), not a
  plain ascending cycle — a harp sweep goes both ways. Unlike the old ascending-only
  cycle (whose length always divided evenly into the beat's 8 32nd-notes), this period
  doesn't, so `playSegment()` resets `arpStepIndex` to 0 explicitly on every new chord
  instead of relying on step-count arithmetic to land back on the root at the next beat.
- iOS/iPadOS Safari puts a page's raw Web Audio output in the "Ambient" audio-session
  category by default, which respects the hardware mute switch — native `<audio>`/
  `<video>` elements get "MediaPlayback" and ignore it. `unlockIOSMediaPlayback()`
  bumps the page into that category by playing a silent, looping, throwaway `<audio>`
  element; the actual synth signal still goes straight to `AudioContext.destination` on
  every platform. Don't route real audio through a `MediaStreamAudioDestinationNode`
  into a media element to achieve this instead — tried that first, and it's a real,
  documented WebKit distortion source, independent of volume/gain staging.

**Randomizer state machine** (`src/hooks/useRandomizer.js`): a single
`Transport.scheduleRepeat` at **32nd-note** granularity (not quarter-note) derives beat
boundaries from a step counter (`stepIndex % 8 === 0`) and calls `tickArpeggio()` every
step. This is one clock, not two, on purpose: an earlier version used a separate '4n'
clock for beats and let the Sequence handle its own '32n' stepping, which left the
relative firing order between "a new chord's notes become available" and "this beat's
arp step reads the current notes" unspecified — the arpeggio would occasionally play one
step behind. Merging them into one callback makes beat-logic (which may hand the player
new arp notes) always run before that same tick's `tickArpeggio()` call.

A "phase" is either a tonal center **playing** or, if `gapBeats > 0`, a silent **gap**
right after it ends. The *next* segment is always pre-generated one phase ahead (so it
can be previewed in the UI), and `makeSegment` re-rolls if it would exactly repeat the
segment that's about to stop.

`makeSegment`'s source for "what's next" is pluggable: `pickRandomTonalCenter` (the
general random pool), `pickRandomTonalCenterFromPairs` (Guitar mode / custom bank
random), and `tonalCenterAtIndex` (custom bank ordered mode) are three interchangeable
sources behind the same clock — none of them touch beat/gap/duration/sound scheduling.
A future practice mode that just needs a different "next chord" rule plugs in here
rather than forking the clock.

**Settings & presets** (`src/hooks/useSettings.js`, `src/music/pool.js`):
- `applyPreset` replaces `enabledTypes` outright — a clean reset to exactly a preset's
  categories, not a merge with whatever's already enabled.
- Guitar is the odd preset out: it sets an explicit `{rootPc, typeKey}` pair list
  (`GUITAR_OPEN_CHORD_PAIRS`) instead of composing `enabledTypes`/`enabledRoots`. The
  real open-chord set is asymmetric (no Cm/Gm — not open-position shapes), which a
  uniform "these roots" × "these qualities" filter can't express.
- `enabledRoots` (the general root filter) is intersected with each type's
  `hasKeySignature`-valid roots inside `pickRandomTonalCenter`, not applied on its own —
  a root selection that doesn't intersect a type's valid roots at all falls back to the
  type's full valid set rather than picking from an empty pool.

**Components**: `App` → `Display` (renders `Turntable`, the spinning-record/beat-panel
visualization) + `Controls` (all the settings UI). `Controls` is wrapped in `memo` with
stable (`useCallback`'d) setters from `useSettings` — without that it would re-render on
every single beat tick via `App`'s state, fighting Tone.js's live scheduling for
main-thread time for no reason.

`Tone.getContext().lookAhead` is intentionally raised from Tone's 0.1s default to 0.2s
in `useRandomizer`'s `start()` — scheduling headroom so a slow React render doesn't
starve the audio thread.
