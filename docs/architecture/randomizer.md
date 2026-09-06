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
metronome, and show-current/next all mean the same thing in every tab, so `TimingFields`,
`RootsPicker`, `MetronomeControl`, and `ShowToggles` are shared components reading the
same settings fields Controls.jsx always used. The risk of sharing one object is a
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
any Pure-Tone-specific branching in the playback path, `label: ''` so `Turntable` shows
just the root name instead of "C ", and an explicit `modeKey: 'none'` so the
record-badge doesn't try to color a pitch by chord/scale difficulty tier (there isn't
one). `buildSegment` checks `type.modeKey` before falling back to deriving one from
`type.category` via `coreModeKeyForCategory`, so a pluggable type can name its own tier
— or lack of one — directly.

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

`App` → `TabNav` (practice-tab switcher) + `Display` (renders `Turntable`, the
spinning-record/beat-panel visualization) + `Controls` or `PureToneControls` (the
settings UI for whichever tab is active). Both settings components share `TimingSection`
(tempo/duration/pause + metronome, boxed as one settings cluster — the metronome lives
there too since it's timing information, it just keeps the beat rather than setting its
length) and `RootsPicker`/`ShowToggles`. Both settings components are wrapped in `memo`
with stable (`useCallback`'d) setters from `useSettings` — without that they'd re-render
on every single beat tick via `App`'s state, fighting Tone.js's live scheduling for
main-thread time for no reason.
