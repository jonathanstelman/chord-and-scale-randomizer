# UI/UX Overhaul — Practice Mode Experience

## Why this doc exists

The [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1)'s
Priority and Size fields say what's important and how big each piece is, but not what
order to build it in — several of these issues depend on another landing first, or
touch the same markup closely enough that building them in sequence avoids rework.
That ordering lives here instead of being re-derived from each issue's own notes (not
all of which spell out a dependency explicitly) every time someone picks up the next
piece.

## Origin

Grew out of a critical UX pass on the Chords & Scales / Pure Tone practice
experience: the practice display competed for visual weight with a wall of settings,
a couple of controls were disconnected from what they affected, and several small
inconsistencies (border treatments, disclosure arrows, "select all" placement) had
crept into the settings UI piecemeal. See each linked issue for the full reasoning
behind it — this doc only tracks sequencing.

## Status at a glance

**Landed:** #21, #22, #23, #25, #26, #27, #28, #29, #31 (subsumed).
**Dropped:** #30 — closed won't-do, see below.
**Remaining:** #24 (L), #20 (M) — plus #34, which spun out of #23.

**Next up:** **#24** (idle state) and **#20** (stacked queue) are what's left of this
initiative, and neither blocks the other.

**Not part of this initiative, but it landed in the middle of it:** #40 rebuilt the
Timing group's internals (captioned blocks, toggles that hold position when clicked,
numeric bounds that actually bind). #27 moved that group into the left column without
touching its internals — the order of a toggle and the fields it governs is load-bearing,
not cosmetic, so read `randomizer.md`'s "Timing group layout" before rearranging it.

## Branching

**Stack only when a piece genuinely builds on unmerged work.** Otherwise branch from
`main`. Two changes touching the same *file* is not a reason to stack — git merges by
hunk, and different regions of `App.css` merge cleanly.

Real dependencies look like: #26 needed #25's `<details>` fix to inherit a working
disclosure arrow; #29 restyles the fieldset markup #28 had just restructured.

When you do stack, its costs are real:

- **Merge bottom-up.** After a base PR merges, delete its branch — GitHub then
  auto-retargets the child to `main` and the child's diff collapses to just its own
  work. Or retarget by hand: `gh pr edit <n> --base main`.
- **Never squash-merge a PR that has children.** Squash puts a *new* commit on `main`
  that isn't in the children's history, so their diffs re-show the merged work and
  likely conflict. Merge commits or rebase-merge keep a stack intact.
- **A change to a base has to be rebased up the whole chain**, so a deep stack makes
  review feedback expensive.

The first run of this overhaul stacked five deep (#21 → #22 → #23 → #25/#26 → #28) and
merged cleanly, but the last two links were independent and were stacked out of
momentum rather than need. Prefer landing the base.

## Build order

**Phase 1 — foundational, no dependencies**
- ~~#21 — Establish a Musical Chairs design language~~ — **landed.** The spec is
  `docs/architecture/design-language.md`; the working material (generator, reference
  sketches, comparison sheet) is `docs/design/chair-motif/`. Downstream work should
  apply that language rather than inventing its own — in particular #24's illustration
  and any further masthead treatment.
- ~~#22 — Display prominence + scroll-triggered PiP mini console~~ — **landed.** Also
  closes **#31**: the chosen prominence treatment removes the display's drop shadow and
  replaces it with a real border, which is exactly what that issue asked for.

**Phase 2 — depends on Phase 1**
- ~~#23 — Move Show current/next into the display~~ — **landed**, and it grew in scope:
  the **Start/Stop transport moved into the display too**, which the issue body never
  said. The display is now the player — see `randomizer.md`'s "The display is the
  player". Pause was considered for a fuller cassette deck and split out to **#34**.
- #24 — Idle state redesign (needs #21's motifs/color decisions). Also owns the idle
  copy: it currently reads "Press play to begin.", which #23 wrote to match the new
  ▶ key.

**Phase 3 — feeds Phase 4**
- ~~#26 — Collapse Custom bank behind details/summary~~ — **landed**, along with #25.
  Also renamed to **"Custom chord bank"** (it only parses chords) and given an Apply
  button plus Enter-to-apply, since committing was previously blur-only.

**Phase 4 — depended on #22, #23, #26**
- ~~#27 — Rebalance settings into two columns~~ — **landed**, and it had to resolve a
  conflict the issue didn't know about: #27 assumed a full-width hero display, while #22
  had actually shipped a *gatefold* with the display as one of two columns. The gatefold
  left a tall void under the display (it's a third the height of the settings stack), so
  the hero won — see `randomizer.md`'s "Settings in two columns" for the full reasoning
  and for the two things that are easy to undo by accident.

  It also needed `.sleeve-stage`: a full-width card would have flung the veil toggles and
  the transport to its far edges, undoing #23's proximity fix. Metronome volume stayed in
  the left column as the issue planned — putting it on the display card was considered
  during #23 and **rejected**, since it changes how the session sounds rather than what
  you're looking at, and moving it would split the metronome's on/off from its level.

**Phase 5 — sequenced together, touch the same fieldset markup**
- ~~#28 — Fieldset headers: drop brackets, stack select-all, indent items~~ — **landed.**
- ~~#29 — Standardize settings groups on bordered boxes~~ — **landed**, and it grew well
  past "one border treatment": once the box held its own header there was no reason only
  two groups collapsed, so **every settings group is now the same collapsible
  `<details>`**, open or closed by nothing but the `open` attribute. Also named the
  previously-anonymous mode cards "Tonal centers", and moved Pure Tone's Roots picker
  into its Notes group (that tab now has no Advanced panel). #27 inherits all of this.

**Independent — land whenever, low coordination cost**
- ~~#25 — Advanced disclosure arrow fix~~ — **landed** (with #26).
- ~~#30 — Visual transition cue on tonal-center change~~ — **closed won't-do.** Explored
  over three rounds (cues on the chord name, then colourings of the beat track) and
  rejected as visual noise: the moment is already marked twice, by the beat track
  resetting to 1 and by the metronome's accented click on that same beat. The comparison
  sheet and the full reasoning are kept in `docs/design/transition-cue/` — read that
  before re-proposing this. Two findings there are worth having anyway: the accented
  click already lands on the downbeat of each new tonal center, and light-mode `--brass`
  is a deep olive for a documented reason that constrains any fill-plus-numeral pairing.
- ~~#31 — Remove the display's drop-shadow~~ — **subsumed by #22.**

## Related but separate

- **#20** (stacked queue of upcoming tonal centers, pre-existing backlog item) has the
  same "control disconnected from display" problem #23 fixed. #23 has landed, so #20 is
  free to proceed without reintroducing that proximity issue in a new form.

- **#20 also owns how big "next" is.** #22 scaled the current reading up to
  `clamp(2rem, 7vw, 3rem)` and deliberately left `.chord-name--next` at
  `clamp(1rem, 3vw, 1.25rem)` — so the gap between them widened from ~1.7x to ~2.4x as a
  side effect. That was left alone on purpose rather than re-tuned, because #20 replaces
  a single "next" with a stack and has to re-decide it anyway.

  The intended hierarchy when that lands: the queue renders **smaller than the current
  reading**, and within the queue every entry is the **same size** — size can't encode
  depth in a stack without becoming a staircase. Depth is carried by **saturation**
  instead, so the top of the queue reads stronger than the entries behind it while still
  clearly sitting below the current tonal center. The `--paper` / `--paper-dim` /
  `--paper-medium` tiers already exist for exactly this kind of recession.

- **#34** (pause a session) spun out of #23. Pause is not just `Transport.pause()` —
  `stopCurrent()` mutes the arpeggio with nothing to un-mute it before the next segment,
  and a held chord sustains through a pause unless released, after which nothing
  re-attacks it. The issue records that plus the ordered-custom-bank case that makes it
  worth doing.

## Working notes for whoever picks this up

- **Mock up visual work before building it.** Every piece of this overhaul was settled
  from a rendered comparison — typefaces, chair motifs, PiP placement, glyph pairs —
  rather than from a written description. Choosing from prose is guessing.
- **Verify in the running app, not just the build.** The Vitest suite covers
  `src/music/` only; there are no component or DOM tests, so anything UI-shaped needs
  looking at. Several bugs this initiative hit were invisible to lint and build: a
  console positioned inside a scrolling container, a CSS rule killed by an orphaned
  comment terminator, a dirty-state check comparing two incomparable representations.
- **Keep the Project board moving** — *In progress* when you branch, *In review* when
  the PR opens. It's the answer to "what's active", and it went stale for three PRs
  during this run.

---
*Living document — update this when an item lands, gets re-scoped, or a new one joins
this initiative. Once everything above ships, this doc has served its purpose and can
be folded into a changelog note or removed.*
