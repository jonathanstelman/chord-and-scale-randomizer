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

`makeSegment`'s source for "what's next" is pluggable: `pickRandomTonalCenter` (the
general random pool), `pickRandomTonalCenterFromPairs` (Guitar mode / custom bank
random), and `tonalCenterAtIndex` (custom bank ordered mode) are three interchangeable
sources behind the same clock — none of them touch beat/gap/duration/sound scheduling.
A future practice mode that just needs a different "next chord" rule plugs in here
rather than forking the clock.

`Tone.getContext().lookAhead` is intentionally raised from Tone's 0.1s default to 0.2s
in `start()` — scheduling headroom so a slow React render doesn't starve the audio
thread.

## Components

`App` → `Display` (renders `Turntable`, the spinning-record/beat-panel visualization) +
`Controls` (all the settings UI). `Controls` is wrapped in `memo` with stable
(`useCallback`'d) setters from `useSettings` — without that it would re-render on every
single beat tick via `App`'s state, fighting Tone.js's live scheduling for main-thread
time for no reason.
