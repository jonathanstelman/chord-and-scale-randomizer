# Engineering Guidelines

Stack, conventions, and how we work — short and skimmable, not exhaustive. For the "why"
behind a specific subsystem's design, see [`docs/architecture/`](./architecture/README.md).

## Stack

- Vite + React 19 — function components and hooks only, no class components.
- Tone.js for all audio.
- oxlint for linting; `react/rules-of-hooks` is an error, not a warning.
- No backend. Static site, all state in `localStorage`. Deployed on Vercel.

## Code organization

- `src/music/` — pure music-theory data and functions, no React or Tone.js dependency.
  See [`architecture/music-theory.md`](./architecture/music-theory.md).
- `src/audio/engine.js` — the only place Tone.js nodes get created. Owns the imperative
  audio graph, exposes a small method surface. See
  [`architecture/audio.md`](./architecture/audio.md).
- `src/hooks/` — state machines and persisted settings; wraps the music/audio layers for
  React. See [`architecture/randomizer.md`](./architecture/randomizer.md) and
  [`architecture/settings-and-presets.md`](./architecture/settings-and-presets.md).
- `src/components/` — UI only.

## Conventions

- **Naming**: camelCase for variables/functions, `SCREAMING_SNAKE_CASE` for module-level
  constants, PascalCase for components and classes.
- **Comments explain *why*, not *what***. A non-obvious decision earns a comment
  explaining the reasoning; a self-explanatory line doesn't need one. See
  [`comment-conventions.md`](./comment-conventions.md) for where a comment has grown too
  big for the code and belongs in `docs/architecture/` instead.
- **Error handling**: fail silently to a sane default rather than surfacing an error UI —
  e.g. a corrupt `localStorage` blob falls back to `DEFAULT_SETTINGS`; an iOS
  autoplay-gesture rejection is swallowed (`.catch(() => {})`). This is a practice tool
  without support obligations, not a product fielding user bug reports — don't add error
  boundaries or toasts without a specific reason to.
- **Git**: one feature/fix per branch off `main`, one PR per branch, with a body
  explaining what changed, why, and how it was verified. Delete the branch after merge
  and sync local `main` before starting the next one.
- **Stack branches only when a piece genuinely builds on unmerged work.** Two changes
  touching the same *file* is not a reason — git merges by hunk. A real dependency looks
  like "this restyles the markup that one just restructured". When you do stack:
  - **Merge bottom-up**, and delete the base branch after it merges — GitHub retargets
    the child to `main` and its diff collapses to just its own work.
  - **Never squash-merge a PR that has children.** Squash puts a *new* commit on `main`
    that isn't in the children's history, so their diffs re-show the merged work and
    likely conflict. Merge commits or rebase-merge keep a stack intact.
  - A change to a base has to be rebased up the whole chain, so a deep stack makes
    review feedback expensive. Prefer landing the base first.

## UI conventions

Two rules the practice-mode overhaul (#20–#31, #40, #45) and the Scale Degrees tab (#8)
each had to re-learn. Both are about the settings surface, where a change of mode or
state shows and hides controls.

- **Controls hold their position.** Toggling a mode, revealing a field, or a value
  changing length may only add or remove *the thing that changed* — nothing else on the
  surface moves. In practice: never let a wrapping flex row decide layout from content
  width when its contents can change. A row whose members are fixed (`TimingSection`,
  `DisplaySection`) can wrap freely; a row that gains or loses a member with state gets
  one row per thing that can appear or disappear. Instances: Timing's toggles that hold
  position (#40); the PiP console's fixed width, sized to the longest phrase rather than
  shrink-to-fit (`randomizer.md`, "PiP console"); Scale Degrees' Labels row, which sat
  beside Root in one mode and beneath it in the other until it got its own row.
- **No control governs nothing.** If a setting has no effect in the current mode, it
  isn't shown in that mode — it isn't greyed out, and it isn't left visible with a note
  explaining it does nothing. A visible control that looks like it governs what plays,
  and doesn't, is hidden state: the user sets it and hears what reads as a bug.
  Instances: Pure Tone's Roots picker, which lived in Advanced and was silently ignored
  in Scale mode until #29 moved it under the mode it applies to; Scale Degrees' Scale
  dropdown, which stayed visible in Chromatic mode until the first real session showed
  why it shouldn't (`randomizer.md`, "Scale Degrees tab"). The exception that proves the
  rule: the transport's Play/Pause/Stop keys never render disabled either — a key that
  can't act isn't shown ("one key, never a disabled twin", `randomizer.md`).
- **A pitch is named by the key it's in.** Never show a root by pitch class alone: a
  minor chord on pitch class 1 is C♯ Minor, the Dorian mode on it is C♯ Dorian, the
  major chord is D♭ Major. A pitch with no key — a symmetric scale, Pure Tone's
  chromatic mode — takes either name at random per pick, never both at once; pickers
  keep one fixed spelling, since a label can't re-roll. What the user typed is never
  re-spelled.
  Every surface that names a pitch goes through `src/music/spelling.js`; the full rule
  and its edge cases are in `architecture/music-theory.md`'s "Root spelling". Getting
  this right where other apps don't is a large part of the point (#62).

## Testing

- `src/music/` (`pool.js`, `chordQualities.js`, `voicing.js`, `notes.js`,
  `chordParser.js`, `scaleFamilies.js`) is pure functions with no DOM/audio dependency —
  this is where automated tests belong, via Vitest (`npm test`). Scaffolded with a first
  pass covering `pool.js`, `chordParser.js`, and `voicing.js`; `chordQualities.js`,
  `notes.js`, and `scaleFamilies.js` are mostly data and covered indirectly through those.
  Pure helpers elsewhere are fair game too when they encode a decision worth pinning —
  `useRandomizer.js`'s queue helpers are unit-tested for exactly that reason.
- Everything else (the audio graph, hooks' React behavior, components) stays covered by
  `npm run lint` + `npm run build` + manual or Playwright smoke checks for behavior
  changes. That's a
  deliberate choice, not a gap to backfill — the audio graph's actual correctness is live
  timing and real-device behavior that neither unit tests nor Playwright can fully
  exercise anyway (see [`architecture/audio.md`](./architecture/audio.md)'s iOS notes and
  [issue #4](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/4) for
  real examples of bugs only a real device surfaced).

## Before a non-trivial change

- Check `docs/product.md` if it's not obviously in scope, or it's unclear which user/flow
  a feature is really for.
- Check `docs/architecture/` for prior decisions on the subsystem you're touching, and the
  [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) for
  related open work — before re-deriving or re-proposing something already scoped or
  already tried.

---
*Living document — update this when a decision changes a convention, not just when
someone asks about it. A newly-discovered non-obvious architecture gotcha belongs in
`docs/architecture/`, in the topic file it fits, not here.*
