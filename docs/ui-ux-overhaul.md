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

## Build order

**Phase 1 — foundational, no dependencies**
- ~~#21 — Establish a Musical Chairs design language~~ — **landed.** The spec is
  `docs/architecture/design-language.md`; the working material (generator, reference
  sketches, comparison sheet) is `docs/design/chair-motif/`. Downstream work should
  apply that language rather than inventing its own — in particular #24's illustration
  and any further masthead treatment.
- #22 — Display prominence + scroll-triggered PiP mini console

**Phase 2 — depends on Phase 1**
- #24 — Idle state redesign (needs #21's motifs/color decisions)
- #23 — Move Show current/next into the display (not a hard dependency on #22, but
  touches the same `Display`/`NowPlaying` markup — do it alongside or right after #22
  rather than in parallel, to avoid rebasing one against the other)

**Phase 3 — independent, but feeds Phase 4**
- #26 — Collapse Custom bank behind details/summary (cheap, can land anytime, but #27
  assumes it's already done)

**Phase 4 — depends on #22, #23, and #26**
- #27 — Rebalance settings into two columns (player controls vs. tonal center
  pickers)

**Phase 5 — sequenced together, touch the same fieldset markup**
- #28 — Fieldset headers: drop brackets, stack select-all, indent items (do first)
- #29 — Standardize settings groups on bordered boxes (do second, on top of #28)

**Independent — land whenever, low coordination cost**
- #25 — Advanced disclosure arrow fix
- #30 — Visual transition cue on tonal-center change (touches `NowPlaying.jsx`, the
  same file as #23/#24 — light coordination, no hard dependency)
- #31 — Remove the display's drop-shadow (flat UI everywhere) — no hard dependency,
  but touches the same visual language #22 and #29 are establishing; land alongside
  or after those so it isn't undone by either

## Related but separate

- **#20** (stacked queue of upcoming tonal centers, pre-existing backlog item) has the
  same "control disconnected from display" problem #23 fixes. Land #23 before or
  alongside #20 so #20's queue doesn't reintroduce the same proximity issue in a new
  form.

---
*Living document — update this when an item lands, gets re-scoped, or a new one joins
this initiative. Once everything above ships, this doc has served its purpose and can
be folded into a changelog note or removed.*
