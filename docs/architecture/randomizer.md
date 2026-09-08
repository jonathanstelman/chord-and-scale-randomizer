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
metronome, and show-current/next all mean the same thing in every tab, so `TimingSection`
and `RootsPicker` are shared components reading the same settings fields Controls.jsx
always used — as does `TonalCenterVisibilityToggles`, which reads the same shared
`showCurrent`/`showNext` from inside the display rather than the settings column. The risk of sharing one object is a
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
settings UI for whichever tab is active). The display also owns the **transport** and the
**visibility toggles** — see "The display is the player" below; the settings components
hold neither. Both settings components share `TimingSection`
(tempo/duration/rest + metronome, boxed as one settings cluster — the metronome lives
there too since it's timing information, it just keeps the beat rather than setting its
length) and `RootsPicker`. Both settings components are wrapped in `memo`
with stable (`useCallback`'d) setters from `useSettings` — without that they'd re-render
on every single beat tick via `App`'s state, fighting Tone.js's live scheduling for
main-thread time for no reason.

### Timing group layout (issue #40)

`TimingSection` renders three blocks — Tempo, Duration, Rest — each headed by its caption
with the value on the line beneath, and every control that belongs to a block inside it.
It reads as a plain stack, but the arrangement is load-bearing and three separate bugs
came out of not having it.

Before this it was one flat `flex-wrap` row with every field and toggle as a peer, which
produced:

- **Toggles rendered after the fields they governed**, so the consequence read before the
  cause. The Pause field sat 106px from its own checkbox and nearer to `Randomize beats`
  than to its toggle, so proximity paired each toggle with the wrong field.
- **An unpredictable wrap point.** At ~700px `Randomize beats` wrapped between Max and
  Pause and read as though it labelled Pause; at 480px the Pause field stranded mid-box.
- **Toggles that displaced themselves when clicked.** Checking a box changed the row's
  item count, reflowing it and moving the box out from under the pointer — 96px for
  `Randomize`, 96px across and 46px down for the pause toggle. A hit target that moves in
  response to being hit.

**The rule that keeps the third one fixed: revealed content must never push down on the
toggle that revealed it.** The two toggles satisfy it by opposite arrangements, and
either is fine as long as that holds:

- `Randomize beats` sits **below** its value line, and what it reveals extends that line
  *sideways* (a second number joins the first), so the line never grows taller.
- `Rest between tones` sits **above** the value it reveals, which appears beneath it.

Don't "tidy" this by moving a toggle above fields that grow downward, or below fields
that grow taller — that reintroduces the displacement.

Two more things not to redo:

- **Rows are top-aligned, not centred.** The Rest block's height changes when its field
  appears, and `align-items: center` re-centres the toggle inside the taller row — a 23px
  drop at the moment of the click. Smaller than the original bug, same bug. The metronome
  is the one thing safe to centre, since it reveals nothing.
- **A grid aligning the value columns across blocks was tried and rejected.** `display:
  contents` on the rows let each toggle and its fields flow as independent grid items,
  landing them on separate grid rows and breaking the pairing entirely. Explicit
  `grid-column` placement would work but hard-codes a column width that a label change
  breaks silently.

A value and its unit are one `.timing-value` span so they wrap as a piece; loose, a
narrow viewport strands part of a reading on a line by itself. The beat range renders as
one value (`4 – 6 beats`) rather than two each carrying its own unit and a min/max
qualifier — which is also why both inputs carry `aria-label`s, since nothing visible
distinguishes them under a single Duration caption.

### The display is the player (issue #23)

The transport and the two visibility toggles live in `Display`, not the settings column,
where they sat about 600px from the reading they govern.

**Transport** is a single key that swaps between ▶ and ■ rather than two keys with one
disabled — there are only two states, and a permanently greyed-out twin is noise on a
card this prominent. `Controls`/`PureToneControls` no longer take `isRunning`/`onStart`/
`onStop` at all.

**The veil toggles** (`TonalCenterVisibilityToggles`) sit in the display's top corners,
each above the reading it governs: current is the left-hand reading, next the right-hand
one. ▣ is a clear pane, ▨ the same pane hatched over. They render only while a session is
running — idle there's no reading to veil, and two glyphs over an empty card read as
decoration.

Three things about the fade that are easy to get wrong:

- **It must fire on the toggle and not on a tonal center change.** Swapping the text of
  one element would either animate every segment or animate nothing, so the reading and
  its `—` placeholder are both mounted and crossfaded by class. The placeholder is
  absolutely positioned so veiling never collapses the row's height.
- **`opacity: 0` alone leaks the answer.** The text stays in the DOM — selectable, and
  still announced by a screen reader — which defeats listening mode. `visibility` flips
  too, delayed by exactly the fade duration on the way out so the animation still plays,
  and undelayed on the way in.
- **`prefers-reduced-motion` already covers this** via `index.css`'s blanket transition
  clamp; it degrades to an instant swap with no extra rule.

The old "Listening mode — tonal center hidden." hint is gone: it existed because the
toggle was far from the reading, and ▨ directly above the `—` now says the same thing.

### Anything that animates per beat (issue #22)

The same main-thread pressure constrains *styling*, not just re-renders. Any visual that
changes on every beat must stay on properties the compositor can handle alone —
`transform` and `opacity`, plus small `background` changes — and must avoid `box-shadow`,
`filter` and `blur`, which force a paint each beat while Tone.js is scheduling audio.
This governs `.beat-block--current` and `.pip-beat--current` today; it applies to any
future beat-synced cue.

### Keeping the screen awake

`useWakeLock` holds a screen wake lock for exactly as long as a session is running.
Practising is a "watching, not touching" activity — you read the display and play an
instrument, generating no input events at all — which is precisely the pattern an idle
timer reads as "away", so the laptop dims and sleeps mid-session.

Two things it has to get right, both of which look like unnecessary ceremony until they
bite:

- **The browser drops the lock whenever the tab is hidden, and never restores it.** One
  request per session isn't enough: switching tabs and back would silently lose the lock
  for the rest of the session, so it re-acquires on `visibilitychange`.
- **The request is async and the session can end while it's in flight.** Without a
  cancelled flag in the effect cleanup, a lock taken for a session that already stopped
  outlives it, and nothing ever releases it.

It's best-effort on purpose. The lock is refused outside a secure context, under battery
saver, and on browsers that don't implement it — in all of those the session still runs
and the screen behaves as it did before, so there's nothing worth telling the user about.

### Settings in two columns (issue #27)

Above 1040px the display is a full-width hero and the settings split beneath it into even
halves: player controls on the left, tonal-center pickers on the right. The split is by
what a setting *governs* — how it plays versus what gets picked — not by size.

**The even split is a measurement, not a preference.** It was 1fr 2fr first, which read
as the right emphasis — the pickers carry the mode row, the presets and the whole
Advanced breakdown — and broke Timing. Its Tempo row needs 394px to keep the bpm field,
the metronome checkbox and the volume slider on one line, which is how #40 built it; a
third of the page is 333px, so the slider wrapped under the checkbox and separated a
control from the thing it controls. The player column can't go below ~426px with the
group's padding. Don't narrow it back on the grounds that the right column looks busier
— at the breakpoint itself, halves leave the Tempo row 54px of slack and 45/55 leaves 6.

**This replaced a gatefold.** #22 had seated the sleeve and the controls side by side as
two columns. That read well in the abstract and badly in practice: the display is about
300px tall and the settings stack about three times that, so the left column was mostly
void. #27 was written expecting a full-width hero and had to be reconciled with what #22
actually shipped; the hero won, because it's the arrangement where the extra width goes
to the column that has content to fill it.

Two things that fall out of it, both easy to undo by accident:

- **The columns are real wrappers** (`.controls-column`), not a `column-count` on
  `.controls`. A settings group must never be split across a column boundary, and
  multi-column layout will happily break one mid-fieldset.
- **Source order is the mobile order.** The player column comes first in the markup,
  which is also the order the single-column stack below the breakpoint wants, so the
  narrow layout needs no reordering — no `order`, no `grid-row` juggling. Keep it that
  way: the moment the columns need reordering for mobile, the two layouts start
  disagreeing about which group follows which.

**`.sleeve-stage` is why a full-width card is safe.** The card spans the page; the stage
inside it caps the content at 46rem — the width the display was designed and mocked at in
#22 — and carries the padding and min-height. It also has to be the containing block for
the three absolutely-positioned corner controls (the two veil toggles and the transport):
pinned to a full-width card they'd sit at its far edges, putting a veil toggle half a page
from the reading it governs, which is the exact proximity problem #23 moved them into the
display to fix. The min-height belongs on the stage rather than the card for a related
reason — a card taller than its content would leave the transport floating above its own
bottom edge.

**Those three controls inset to the stage's content edge (2rem), not its border box.** At
0.7rem they sat 21px inside the text above them — near enough to read as a misalignment
rather than a margin — and on a full-width card they were anchored to nothing at all,
floating ~150px in from the card's own edge. At the content edge the transport key sits
directly below the current reading and each veil toggle directly above the reading it
governs.

The transport's *bottom* offset is deliberately larger than the toggles' top. Those are
borderless glyphs; the transport is a bordered key, and at an equal gap a drawn box reads
as crowding the card's border. It's an optical correction, not an inconsistency to
unify.

### PiP console (`PipConsole.jsx`, issue #22)

A floating console that docks once the in-flow display scrolls out of the viewport and
un-docks when it returns — true picture-in-picture, not an always-on widget. `App` holds
a ref to the `.sleeve` element — the outer card, not `.sleeve-stage` inside it, since the
card is what actually leaves the viewport — and hands it to `PipConsole`, which observes
it with an `IntersectionObserver`. The observer uses a small
negative `rootMargin`: without it the console flickers on and off while the display sits
exactly at the viewport edge.

**It aligns to the page column, not the viewport corner**, so on a wide screen it doesn't
float alone out in the margin. Being `position: fixed` it can't inherit that column's
edges and has to compute them, which is why `--app-column` exists: the console derives its
`left` from the same token `.app` sizes itself with. It previously hard-coded half of
720px while `.app` had been widening to 1080px at the breakpoint since #22 — so above
1040px the console sat 204px inside the column, correct at narrow widths and visibly adrift
at wide ones. Any future change to the column's width has to stay a change to that one
token.

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
