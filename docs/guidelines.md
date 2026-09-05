# Engineering Guidelines

See [`CLAUDE.md`](../CLAUDE.md) at the repo root for the detailed architecture writeup
(why the music/audio/state layers are split the way they are, and the specific gotchas in
each). This file is the shorter, skimmable version: stack, conventions, and how we work.

## Stack

- Vite + React 19 — function components and hooks only, no class components.
- Tone.js for all audio.
- oxlint for linting (`npm run lint`); `react/rules-of-hooks` is an error, not a warning.
- No backend. Static site, all state in `localStorage`. Deployed on Vercel with zero
  config beyond `npm run build`.

## Code organization

- `src/music/` — pure music-theory data and functions, no React or Tone.js dependency.
  Keep it that way: if something here needs to import from `audio/` or `components/`,
  that's a sign it belongs in one of those instead.
- `src/audio/engine.js` — the only place Tone.js nodes get created. Owns the imperative
  audio graph, exposes a small method surface (`playSegment`, `tickArpeggio`, etc.).
- `src/hooks/` — state machines and persisted settings; wraps the music/audio layers for
  React.
- `src/components/` — UI only.

## Conventions

- **Naming**: camelCase for variables/functions, `SCREAMING_SNAKE_CASE` for module-level
  constants, PascalCase for components and classes.
- **Comments explain *why*, not *what***. Match the density already in the codebase — a
  non-obvious decision earns a comment explaining the reasoning (see any file in
  `src/audio/` or `src/music/pool.js` for the house style); a self-explanatory line
  doesn't need one.
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
  writing; see `docs/HANDOFF.md` once it is.
- Everything else (the audio graph, hooks, components) stays covered by `npm run lint` +
  `npm run build` + manual or Playwright smoke checks for behavior changes. That's a
  deliberate choice, not a gap to backfill — the audio graph's actual correctness is live
  timing and real-device behavior that neither unit tests nor Playwright can fully
  exercise anyway (see `docs/HANDOFF.md` #7/#12 for real examples of bugs only a real
  device surfaced).

## Before a non-trivial change

- Check `docs/product.md` if it's not obviously in scope, or it's unclear which user/flow
  a feature is really for.
- Check `docs/HANDOFF.md` for related open items or prior decisions before re-deriving
  something already scoped or already tried.

---
*Living document — update this when a decision changes a convention, not just when
someone asks about it.*
