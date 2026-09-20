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
right after it ends. Segments are pre-generated ahead of the one playing — at least one,
and as many as the display's queue is set to show (see "Queue depth" below) — and
`makeSegment` re-rolls if a pick would exactly repeat the segment before it.

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

Per issue #6, tabs are plain in-app state (`settings.activeTab`: `'randomizer'`,
`'pureTone'` or `'scaleDegrees'`), not routes — the app has no backend or router today,
and bookmarking a specific practice mode wasn't a requirement worth taking on routing's
history/back-button behavior for. Switching tabs while a session is running calls
`stop()` first (in `App.jsx`'s `handleSelectTab`) rather than letting the old tab's
segment linger until the next beat boundary and then silently start drawing from the new
tab's source — two tabs never share a live session.

Tabs share one flat settings object rather than each owning its own storage key (see
`docs/architecture/settings-and-presets.md`): tempo, duration/gap, the roots filter,
metronome, queue depth, and show-current/next all mean the same thing in every tab, so
`TimingSection`, `DisplaySection` and `RootsPicker` are shared components reading the
same settings fields Controls.jsx always used — as does `TonalCenterVisibilityToggles`,
which reads the same shared `showCurrent`/`showNext` from inside the display rather than
the settings column. Settings that belong to one tab alone carry its prefix
(`pureTone*`, `scaleDegrees*`) so two tabs' notions of "root" or "scale" never share a
key: Pure Tone's Scale mode and Scale Degrees both pick a key, but switching tabs
shouldn't silently carry one tab's choice into the other. The risk of sharing one
object is a Randomizer-only field (`soundType`, `maxChordNotes`, `enabledTypes`,
`enabledPairs`, `customBankEnabled`/`customBankEntries`) leaking into a tab that has no
UI for it and shouldn't care what it's set to — `useRandomizer` avoids that two ways:
`forceSoundType` overrides `settings.soundType` outright for a tab (Pure Tone passes
`'chord'`, since a 1-note "arpeggio" would otherwise run `padToSimpleArpeggioLength`
pointlessly and `'none'` would silently defeat the whole exercise), and
`pickNextForPureTone` never reads the custom-bank/pairs fields at all rather than
special-casing around them.

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

### Scale Degrees tab (issue #8)

Functional ear training: a tonic drone sustains for the whole session and each segment
strikes one note from the octave above it, which the display names as a scale degree
relative to the drone rather than as an absolute pitch. The spelling rule lives in
`music-theory.md` ("Scale-degree spelling"), the drone's place in the audio graph in
`audio.md` ("Drone"); this section covers the settings surface (`ScaleDegreesControls.jsx`)
and how the tab plugs into the clock and the display.

It's Pure Tone's sibling — same two-column split, `TimingSection` + `DisplaySection` in
the player column — with two groups in the picker column, both open by default:

- **Notes** — where a target note comes from and how it's named. A two-button
  **Diatonic / Chromatic** toggle (`scaleDegreesPool`, the same persisted-choice pattern
  as Pure Tone's Chromatic/Scale, not an `activePresetKey` preset), **Root**
  (`scaleDegreesRootPc`), **Scale** (`scaleDegreesScaleKey`, the same grouped dropdown
  and "Ionian (Major)" / "Aeolian (Natural Minor)" overrides Pure Tone uses, shared via
  `scaleOptions.js`), and **Labels** (`scaleDegreesLabels`: numbers or do-based solfège).
- **Drone** — what the reference sounds like. **Sound** (`scaleDegreesDrone`: tonic
  alone, tonic + fifth, or the scale's I chord) and **Level** (`scaleDegreesDroneVolume`,
  0–100 on the metronome-volume slider pattern — `.drone-level` shares the
  `.metronome-volume` CSS rather than duplicating it). Level is never disabled: the drone
  is the exercise's reference and runs through rests, so there's no "off" for it to be
  greyed out by.

**Root and Scale are always visible, in both pool modes.** This is the one place the tab
deliberately departs from Pure Tone, where Roots and Scale are mutually exclusive
because each mode's picker *is* its pool. Here the key does two jobs the pool toggle
doesn't touch: the drone sounds it, and every target — in-scale or not — is labeled
against it (a Chromatic ♭3 is only a ♭3 relative to some tonic). Chromatic mode widens
what can be drawn; it doesn't remove the need for a key to hear it against. Hiding Root
and Scale in Chromatic would leave the drone playing a key the user couldn't see or
change.

There is no Roots picker on this tab, and `enabledRoots` is not read: the target pool is
"degrees of this key", and filtering *which* degrees is a different exercise (and out of
scope in #8).

**Playback plugs in through the same two seams as Pure Tone, plus one.**
`pickNextForScaleDegrees` is the tab's `pickNextTonalCenter`; `forceSoundType` is
`'chord'` for the same reasons as Pure Tone's. What's new is that a picker's result may
carry more than `{ rootPc, type }` — `makeSegment` spreads any extra fields onto the
segment — and this one carries two:

- `degree: { number, accidental }`, the raw label. It's formatted at *render* time
  (`tonalCenterPhrase(item, labelStyle)`), not when the segment is generated, so flipping
  Numbers ↔ Solfège mid-session relabels the current readout and the whole queue at
  once. `visibleQueue`/`setCurrent` pass `degree` through only when present, so the
  other tabs' readout shape is unchanged.
- `noteNames`, the exact note to play. `playSegment` uses it instead of voicing the
  segment when present: `voiceChord` would put the target at `rootOctave: 3`, on top of
  the drone, and the exercise needs it in the octave above (`targetNoteName`).

The third seam is `options.drone: { notes, volume }`. `useRandomizer` starts it in
`start()` right after the player exists, stops it in `stop()` — **`stopCurrent()` does
not touch it by design** (`audio.md`), so without the explicit `stopDrone()` the drone
would outlive Stop and the tab switch that calls it — and leaves pause/resume to the
engine's own snapshot. Two effects keep it live: volume follows the slider, and the
notes follow Root/Scale/Sound. That last one is a deliberate departure from "change key
= stop, change, start": if the drone *didn't* follow, every degree for the rest of the
session would be labeled against a tonic nobody hears; following it leaves only the
already-pregenerated queue (at most `queueDepth` segments) labeled against the old key.
It's suppressed while paused — `startDrone()` would sound over the pause — and applied on
resume via the `isPaused` dependency. The effect is keyed to the joined note names, not
the array, because `App` rebuilds that array every render.

**The display.** A segment with a `degree` renders as a stack (`.readout--degree`): an
eyebrow naming the key ("in C Major", `keyDisplayName` in `scaleOptions.js` — the
familiar word for Ionian/Aeolian, the mode name otherwise), the degree in the readout
size, and the absolute note name beneath in the queue's size behind its own veil,
`showNoteName`. That veil is the third `TonalCenterVisibilityToggles` toggle, rendered
only on this tab; its placement (currently trailing the current toggle along the
top-left) is provisional pending a look in the running app. The PiP console takes
`labelStyle` for the same `tonalCenterPhrase` call and shows the degree only — no note
name, no key: the console is for staying on the beat.

### Tab copy (`App.jsx`)

Each tab's description (below the tab row) is comparable in shape on purpose: it names
what randomizes in that tab, then what you do about it, ending on the same "before the
next one comes" beat, so switching tabs reads as switching *content*, not switching how
the app talks to you. The shared "tonal center" concept (root note, chord, or scale)
lives once, in the app-purpose blurb above the tabs, rather than being repeated or
redefined per tab.

Scale Degrees stretches the first slot rather than breaking the shape: "A drone sets
the key, then a random note above it" establishes the reference *before* naming what
randomizes, because a scale degree only means anything relative to a key — "a random
note" alone would describe Pure Tone. Its second slot then borrows Pure Tone's "or find
it on your instrument" verbatim: both are single-note tabs where the physical response
is identical, and only the naming differs ("name it" versus "name its scale degree"),
so the copy makes that the one visible difference.

## Components

`App` → `TabNav` (practice-tab switcher) + `Display` (renders `NowPlaying`, the
current/next readout + beat-panel visualization) + `Controls`, `PureToneControls` or
`ScaleDegreesControls` (the settings UI for whichever tab is active). The display also owns the **transport** and the
**visibility toggles** — see "The display is the player" below; the settings components
hold neither. All three settings components share `TimingSection`
(tempo/duration/rest + metronome, boxed as one settings cluster — the metronome lives
there too since it's timing information, it just keeps the beat rather than setting its
length) and `DisplaySection`; the first two also share `RootsPicker`. All three are
wrapped in `memo` with stable (`useCallback`'d) setters from `useSettings` — without
that they'd re-render on every single beat tick via `App`'s state, fighting Tone.js's
live scheduling for main-thread time for no reason.

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

### Idle state (issue #24)

The card shows a worked example of a real result — a fixed `C Major`, a `Next`, a beat
numeral and a four-beat track — rather than an empty box, so a first-time visitor can see
the shape of what they are about to get before pressing anything.

Three things about it:

- **It reuses the live classes** (`readout-row`, `chord-name`, `beat-block`) instead of
  its own markup, so it cannot drift from what a session actually looks like. The sample
  only overrides what makes it a sample: smaller type, one wrapper opacity, a caption.
- **The dimming is one `opacity` on the wrapper, not per-element colours.** The beat
  blocks are flame and cobalt, neither of which has a dimmed variant to reach for.
- **It's `aria-hidden`.** A screen reader announcing "C Major" on an idle card would be
  announcing a chord that isn't playing; the copy beneath already says what to do.

`.sleeve-idle` needs `width: 100%` explicitly. The stage centres its children, which
would otherwise shrink it to its content and stop the example spanning edge-to-edge the
way a live readout does — which is the one thing it exists to demonstrate.

**The example was chosen fixed rather than cycling.** A rotating name on an idle card
reads as a session that's already running, and the point is the *shape* of a result, not
its content.

### The display is the player (issue #23)

The transport and the two visibility toggles live in `Display`, not the settings column,
where they sat about 600px from the readout they govern.

**Transport** is a cassette deck: a primary key that swaps between ▶ and ‖ rather than
going disabled, plus ■ for as long as a session exists (#34 added pause; before it, the
primary key swapped ▶/■). A permanently greyed-out twin would be noise on a card this
prominent, so no key is ever shown disabled. `Controls`/`PureToneControls` no longer take `isRunning`/`onStart`/
`onStop` at all. The PiP console carries the same swapping key (see "PiP console"); the
*settings columns* are what hold no transport.

**The veil toggles** (`TonalCenterVisibilityToggles`) sit in the display's top corners,
each above the readout it governs: current is the left-hand readout, next the right-hand
one. ▣ is a clear pane, ▨ the same pane hatched over. They render only while a session is
running — idle there's no readout to veil, and two glyphs over an empty card read as
decoration.

Three things about the fade that are easy to get wrong:

- **It must fire on the toggle and not on a tonal center change.** Swapping the text of
  one element would either animate every segment or animate nothing, so the readout and
  its `—` placeholder are both mounted and crossfaded by class. The placeholder is
  absolutely positioned so veiling never collapses the row's height.
- **`opacity: 0` alone leaks the answer.** The text stays in the DOM — selectable, and
  still announced by a screen reader — which defeats listening mode. `visibility` flips
  too, delayed by exactly the fade duration on the way out so the animation still plays,
  and undelayed on the way in.
- **`prefers-reduced-motion` already covers this** via `index.css`'s blanket transition
  clamp; it degrades to an instant swap with no extra rule.

The old "Listening mode — tonal center hidden." hint is gone: it existed because the
toggle was far from the readout, and ▨ directly above the `—` now says the same thing.

### Queue depth (issue #20)

The display shows up to four upcoming tonal centers, stacked. `queueRef` holds the
pregenerated segments, soonest first; `advanceToNext` shifts one off and refills behind
it.

**Depth and the veil are separate settings, not one control.** `queueDepth` (0-4) is how
many upcoming centers exist on screen; `showNext` is the veil drawn over them for
listening practice. The issue guessed `showNext` would *become* a count, but collapsing
them would have meant losing listening mode at any depth above zero — the veil's whole
job is to hide an answer that's still there. At `queueDepth: 0` there's nothing to veil,
so `TonalCenterVisibilityToggles` drops the next toggle rather than leaving a control
governing nothing. Default depth is 1, which is exactly what the display showed before
the queue existed.

**The pregenerated queue is never shorter than one, and never shrinks mid-session.**
`pregenDepth` floors it at 1 because the clock hands the player its next segment a phase
early whether or not anything displays it. It only grows because of **ordered
custom-bank mode**: entries are generated by walking the user's written progression, so
discarding an already-generated entry when the depth is lowered would silently skip a
chord they typed. Lowering the depth therefore hides entries rather than dropping them —
`visibleQueue` slices what the display gets, and the queue's own length is not what
decides whether anything renders. `useRandomizer.test.js` pins this.

**Repeat avoidance stays strictly adjacent.** Each queued segment only avoids repeating
the one immediately before it, exactly as it did when there was a single "next". Widening
it to "no repeat anywhere in the visible queue" was rejected: the rule exists so a tonal
center never appears to change while sounding the same, which is a property of adjacency,
and a whole-queue rule is unsatisfiable with a small pool — a three-entry custom bank in
random mode at depth 4 cannot produce four distinct entries, so the retry cap would blow
and hand back arbitrary picks. Two identical entries a few places apart read as a
coincidence; two in a row read as a bug.

**Depth is carried by saturation, never size.** Every entry renders at the same size —
size encoding depth turns the stack into a staircase — and recedes through the existing
`--paper` tiers: `.chord-name--q1` through `--q4` map to `--paper`, `--paper-dim`,
`--paper-medium`, `--paper-faint`. **`--paper-faint` is 0.14 alpha and is marginal at
depth 4**, in light mode especially; it was chosen deliberately over a bespoke ramp to
keep the queue on the app's own tiers. If the fourth entry ever needs to be genuinely
readable, a compressed ramp (1 / .74 / .55 / .40) is the alternative that was rendered
and set aside — see `docs/design/queue-stack/`.

Entry size is `clamp(1.05rem, 3.2vw, 1.4rem)`. #22 had left `.chord-name--next`
deliberately untuned for this issue to re-decide, since a stack changes the question.

**One veil covers the whole queue**, with a single `—` placeholder anchored to the head
of the column rather than centred in it: four stacked placeholders would read as four
hidden things rather than one hidden queue, and at four deep a centred dash floats away
from the eyebrow labelling it.

**Below 560px `.readout-row` is an explicit column — never `flex-wrap: wrap`.** Wrapping
let flexbox decide beside-or-below from the *combined* text width of the readout and the
queue, so the queue hopped between the two positions whenever a long tonal center came
up, several times a minute. That's the same unpredictability the row's `nowrap` avoids at
full width; a queue makes it far more visible than a single "next" did. The current
readout also reserves two lines at that width (`.readout--current .veilable`), so a name
that wraps doesn't step the queue down a line and back.

Stacked, the queue stays **right-aligned to the card's content edge** — the same edge the
corner controls inset to (see "Settings in two columns"), so the queue lines up under the
veil toggle that governs it. That needs `align-items: stretch` written out in the media
query: the row's base `align-items: center` means "centre vertically" in a row but
"shrink-wrap and centre horizontally" in a column, which leaves the queue floating short
of the edge.

**The depth control lives in a shared `Display` settings group** (`DisplaySection`), in
the player column of both tabs — it governs how the session is presented back to you, not
what gets picked. Both tabs use the same depth: Pure Tone's single note names are shorter
than a chord name, not longer, so nothing argued for a per-tab allowance.

### Pause vs. stop (issue #34)

**They mean different things, deliberately.** `start()` resets `orderedBankIndexRef` to
0, so stopping and playing again walks an ordered custom bank from its top — that's
"start the progression over". Pause is the operation that keeps your place. Before #34
there was only one of the two, so anyone working through a written progression lost
their position every time they stopped to adjust something.

For a **random** pool the distinction barely exists: the stream is memoryless, so
stop-then-play hands you a tonal center exactly as valid as the one you left. An ordered
custom bank is the case pause was built for. The key is still shown for every mode
anyway — a deck that changes shape depending on a setting three groups down the page is
harder to learn than one extra key, and pause is independently useful for silencing the
room without losing the segment.

`Tone.Transport.pause()` halts the clock where it stands, so the beat counter, the
segment's remaining beats and the bank cursor all keep their values and
`Tone.Transport.start()` carries on from that point. The audio side is the part that
isn't free — see `audio.md`'s "Pausing mid-segment".

**The wake lock follows `isRunning && !isPaused`.** A paused session isn't being watched,
so the screen is allowed to sleep; see "Keeping the screen awake".

**The deck is play/pause + stop, and the PiP console mirrors it.** The console can't
simplify to a single key here: a lone ▶ would call `start()` on a paused session and
silently restart an ordered bank, which is precisely the bug pause exists to prevent.

Paused, the card looks like a running one whose beat track has stopped — no badge, no
dimming. The deck reading **PLAY / STOP** and a frozen beat track are the indication.
This follows #30's finding that the card resists extra state decoration; if it turns out
to read as "stuck" rather than "paused" in real use, that's the thing to revisit.

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
from the readout it governs, which is the exact proximity problem #23 moved them into the
display to fix. The min-height belongs on the stage rather than the card for a related
reason — a card taller than its content would leave the transport floating above its own
bottom edge.

**Those three controls inset to the stage's content edge (2rem), not its border box.** At
0.7rem they sat 21px inside the text above them — near enough to read as a misalignment
rather than a margin — and on a full-width card they were anchored to nothing at all,
floating ~150px in from the card's own edge. At the content edge the transport key sits
directly below the current readout and each veil toggle directly above the readout it
governs.

The transport's *bottom* offset is deliberately larger than the toggles' top. Those are
borderless glyphs; the transport is a bordered key, and at an equal gap a drawn box reads
as crowding the card's border. It's an optical correction, not an inconsistency to
unify.

### PiP console (`PipConsole.jsx`, issues #22, #45)

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
  display deliberately withholds the readout, and the console must not become a way to
  peek at it — it renders the same `—`.
- **`showNext` gates the next readout** the same way, matching `NowPlaying`.
- **Both read through `tonalCenterPhrase`** (`src/music/pool.js`), so Pure Tone's
  typeless segments can't render one way in the display and another in the console.

It shows current, the queue and a beat cue. **No tempo or volume** — those are one
scroll away, and the console is for staying on the beat rather than being a second
control surface.

**It does have a transport, and always did.** The ✕ that shipped with #22 was
`aria-label="Stop session"` calling `onStop` — a stop key wearing a dismiss glyph, since
dismissing the console and leaving audio running would strand a session with no visible
controls. #45 made that honest: one `.pip-key` that swaps ▶/■, the same "one key, never
a disabled twin" rule the display's deck follows. This is a narrowing of #23's "the
console gets no transport", not a reversal of it — tempo and volume still live only in
the settings column.

#### Idle state (issue #45)

The console docks whether or not a session is running. Idle it shows the wordmark and a
play key, and nothing else: the display one scroll up already carries the worked example
from #24, and reproducing it in a 15rem box would be an example of an example. The play
key is the *reason* the idle console exists — without it, an idle console is a label you
can't act on, and you'd scroll back to the display to start, which is the disconnect #22
built the console to remove.

#### Where this actually docks

Measured before building #45, because #27's two-column settings made the page much
shorter than it was when #22 built the console. Slack = scroll room past the docking
point; negative means it can never dock. Idle and running measure the same, since
`.sleeve`'s `min-height` dominates at 306px either way.

| Viewport | Chords & Scales | Pure Tone |
|---|---|---|
| MacBook Pro 14" 1512×982 | −357 | −495 |
| MacBook Air 1440×900 | −275 | −413 |
| Laptop 1280×800 | −175 | −313 |
| iPad portrait 834×1112 | −63 | −445 |
| Short window 1400×560 | **+65** | −73 |
| iPad landscape 1024×768 | **+281** | −101 |
| iPhone Pro Max 430×932 | **+268** | −166 |
| iPhone 14 390×844 | **+422** | −36 |

**The console is a phone feature now**, and on Pure Tone it never docks at all. Neither
is a bug: the console exists for when the display isn't visible, and on a laptop — or on
a tab with almost no settings to scroll past — it always is. Don't "fix" the Pure Tone
column by padding the page to force a dock. Do re-measure this table before investing
further here; it has already shifted once under a layout change that had nothing to do
with the console.

**The width is fixed, the height is free.** Shrink-to-fit made the box resize on every
segment as names changed length, which reads as the console twitching in the corner. It
is pinned at `15rem`, sized against the longest phrase the vocabulary can produce —
`D♭ Half-Diminished (m7♭5)`, 25 characters — which wraps to a second line rather than
being truncated, because a clipped chord name is worse than a taller card. If a longer
type label is ever added, check it here: the failure mode is silent wrapping, not
overflow.

The queue sits below *current* rather than beside it. At a fixed width there isn't room
for two readouts side by side, and it's the order the stacked queue needs anyway. Its
entries stay **left-aligned** here, unlike the display's right-aligned column: the card
gives the queue its own right-hand column to align to, and the console — one narrow
stack — has none, so left-aligning keeps one scan edge with the readout above it.
