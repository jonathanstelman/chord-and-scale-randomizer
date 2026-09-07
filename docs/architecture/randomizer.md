# Randomizer state machine (`src/hooks/useRandomizer.js`)

A single `Transport.scheduleRepeat` at **32nd-note** granularity (not quarter-note)
derives beat boundaries from a step counter (`stepIndex % 8 === 0`) and calls
`tickArpeggio()` every step. This is one clock, not two, on purpose: an earlier version
used a separate '4n' clock for beats and let the Sequence handle its own '32n' stepping,
which left the relative firing order between "a new chord's notes become available" and
"this beat's arp step reads the current notes" unspecified — the arpeggio would
occasionally play one step behind. Merging them into one callback makes beat-logic
(which may hand the player new arp notes) always run before that same tick's
`tickArpeggio()` call.

A "phase" is either a tonal center **playing** or, if `gapBeats > 0`, a silent **gap**
right after it ends. The *next* segment is always pre-generated one phase ahead (so it
can be previewed in the UI), and `makeSegment` re-rolls if it would exactly repeat the
segment that's about to stop.

`makeSegment`'s source for "what's next" is pluggable: `pickNextForRandomizer` (which
itself picks between the general random pool, Guitar mode / custom bank random, and
custom bank ordered mode) is the default, and `pickNextForPureTone` (see below) is the
other. Both are interchangeable behind the same clock — neither touches beat/gap/
duration/sound scheduling. A future practice mode that just needs a different "next
chord" rule plugs in here rather than forking the clock.

`Tone.getContext().lookAhead` is intentionally raised from Tone's 0.1s default to 0.2s
in `start()` — scheduling headroom so a slow React render doesn't starve the audio
thread.

## Practice tabs (`App.jsx`, `useRandomizer(settings, options)`)

Per issue #6, tabs are plain in-app state (`settings.activeTab`), not routes — the app
has no backend or router today, and bookmarking a specific practice mode wasn't a
requirement worth taking on routing's history/back-button behavior for. Switching tabs
while a session is running calls `stop()` first (in `App.jsx`'s `handleSelectTab`)
rather than letting the old tab's segment linger until the next beat boundary and then
silently start drawing from the new tab's source — two tabs never share a live session.

Tabs share one flat settings object rather than each owning its own storage key (see
`docs/architecture/settings-and-presets.md`): tempo, duration/gap, the roots filter,
metronome, and show-current/next all mean the same thing in every tab, so `TimingSection`,
`RootsPicker`, and `ShowToggles` are shared components reading the same settings fields
Controls.jsx always used. The risk of sharing one object is a
Randomizer-only field (`soundType`, `maxChordNotes`, `enabledTypes`, `enabledPairs`,
`customBankEnabled`/`customBankEntries`) leaking into a tab that has no UI for it and
shouldn't care what it's set to — `useRandomizer` avoids that two ways: `forceSoundType`
overrides `settings.soundType` outright for a tab (Pure Tone passes `'chord'`, since a
1-note "arpeggio" would otherwise run `padToSimpleArpeggioLength` pointlessly and
`'none'` would silently defeat the whole exercise), and `pickNextForPureTone` never reads
the custom-bank/pairs fields at all rather than special-casing around them.

### Pure Tone tab (issue #7)

A single random pitch, no chord/scale quality — `pickNextForPureTone` pairs whatever
pitch class it picks with `PURE_TONE_TYPE` (`pool.js`): `intervals: [0]` so
`voiceChord`/`padToSimpleArpeggioLength` degenerate to "one note" automatically without
any Pure-Tone-specific branching in the playback path, and `label: ''` so `NowPlaying`
shows just the root name instead of "C ".

Which pitch class it picks depends on `settings.pureToneMode`, a two-preset toggle in
`PureToneControls.jsx` (not routed through `activePresetKey`/`applyPreset` like the
Randomizer tab's presets — it's the persisted choice itself, with nothing to "customize
away from" since there's no mode/type checkboxes to conflict with it):
- **Chromatic** (default): `pickRandomRootPc(settings.enabledRoots)` — any of the 12
  pitch classes, filtered by the shared Roots picker, same as `pickRandomRootPc` is used
  elsewhere.
- **Scale**: `pickRandomScalePc(settings.pureToneScaleRootPc, settings.pureToneScaleKey)`
  — every tone of a chosen scale (via `scalePitchClasses` in `pool.js`, which reads
  `SCALE_TYPES[...].degrees` — *every* scale degree, not the `chordIntervals` subset used
  to voice a chord elsewhere), for solfège-style practice within one key. Deliberately
  ignores `enabledRoots` entirely while active — the same "an alternate source bypasses
  the general filter" precedent as Guitar/Beginner's pairs (see
  settings-and-presets.md) — so the Roots picker only has an effect in Chromatic mode.

### Tab copy (`App.jsx`)

Each tab's description (below the tab row) is comparable in shape on purpose: it names
what randomizes in that tab, then what you do about it, ending on the same "before the
next one comes" beat, so switching tabs reads as switching *content*, not switching how
the app talks to you. The shared "tonal center" concept (root note, chord, or scale)
lives once, in the app-purpose blurb above the tabs, rather than being repeated or
redefined per tab.

## Components

`App` → `TabNav` (practice-tab switcher) + `Display` (renders `NowPlaying`, the
current/next reading + beat-panel visualization) + `Controls` or `PureToneControls` (the
settings UI for whichever tab is active). Both settings components share `TimingSection`
(tempo/duration/pause + metronome, boxed as one settings cluster — the metronome lives
there too since it's timing information, it just keeps the beat rather than setting its
length) and `RootsPicker`/`ShowToggles`. Both settings components are wrapped in `memo`
with stable (`useCallback`'d) setters from `useSettings` — without that they'd re-render
on every single beat tick via `App`'s state, fighting Tone.js's live scheduling for
main-thread time for no reason.

### Anything that animates per beat (issue #22)

The same main-thread pressure constrains *styling*, not just re-renders. Any visual that
changes on every beat must stay on properties the compositor can handle alone —
`transform` and `opacity`, plus small `background` changes — and must avoid `box-shadow`,
`filter` and `blur`, which force a paint each beat while Tone.js is scheduling audio.
This governs `.beat-block--current` and `.pip-beat--current` today; it applies to any
future beat-synced cue.

### PiP console (`PipConsole.jsx`, issue #22)

A floating console that docks once the in-flow display scrolls out of the viewport and
un-docks when it returns — true picture-in-picture, not an always-on widget. `App` holds
a ref to the `.sleeve` element (the ref lands on the sleeve itself, not a wrapper, since
a wrapper would become the grid item in the two-column layout) and hands it to
`PipConsole`, which observes it with an `IntersectionObserver`. The observer uses a small
negative `rootMargin`: without it the console flickers on and off while the display sits
exactly at the viewport edge.

Two rules it has to keep in step with `Display`:

- **It shows what the display shows.** With `showCurrent` off (listening mode), the main
  display deliberately withholds the reading, and the console must not become a way to
  peek at it — it renders the same `—`.
- **`showNext` gates the next reading** the same way, matching `NowPlaying`.
- **Both read through `tonalCenterPhrase`** (`src/music/pool.js`), so Pure Tone's
  typeless segments can't render one way in the display and another in the console.

It shows current, next and a beat cue — no transport, tempo or volume; those are one
scroll away. The ✕ stops the session outright rather than just hiding the console:
dismissing it and leaving audio running would strand a session with no visible controls.

**The width is fixed, the height is free.** Shrink-to-fit made the box resize on every
segment as names changed length, which reads as the console twitching in the corner. It
is pinned at `15rem`, sized against the longest phrase the vocabulary can produce —
`D♭ Half-Diminished (m7♭5)`, 25 characters — which wraps to a second line rather than
being truncated, because a clipped chord name is worse than a taller card. If a longer
type label is ever added, check it here: the failure mode is silent wrapping, not
overflow.

*Next* sits below *current* rather than beside it. At a fixed width there isn't room for
two readings side by side, and the vertical order is the one #20's stacked queue will
need anyway.
