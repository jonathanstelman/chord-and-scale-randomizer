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
  [`style-guide.md`](./style-guide.md) for where a comment has grown too big for the
  code and belongs in `docs/architecture/` instead.
- **Error handling**: fail silently to a sane default rather than surfacing an error UI —
  e.g. a corrupt `localStorage` blob falls back to `DEFAULT_SETTINGS`; an iOS
  autoplay-gesture rejection is swallowed (`.catch(() => {})`). This is a practice tool
  without support obligations, not a product fielding user bug reports — don't add error
  boundaries or toasts without a specific reason to.
- **Git**: one feature/fix per branch off `main`, one PR per branch, with a body
  explaining what changed, why, and how it was verified. Delete the branch after merge
  and sync local `main` before starting the next one.

## Testing

- `src/music/` (`pool.js`, `chordQualities.js`, `voicing.js`, `notes.js`,
  `chordParser.js`, `scaleFamilies.js`) is pure functions with no DOM/audio dependency —
  this is where automated tests belong, via Vitest. Not yet scaffolded as of this
  writing — tracked as [issue #9](https://github.com/jonathanstelman/chord-and-scale-randomizer/issues/9).
- Everything else (the audio graph, hooks, components) stays covered by `npm run lint` +
  `npm run build` + manual or Playwright smoke checks for behavior changes. That's a
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
