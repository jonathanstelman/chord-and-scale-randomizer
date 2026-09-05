# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs

Read the one relevant to what you're doing, not all of them — that's the point of the split.

- `docs/product.md` — vision, audience, core user flows, explicit out-of-scope
- `docs/guidelines.md` — stack, conventions, testing approach; short enough to read in full
- `docs/comment-conventions.md` — when a comment has outgrown the code and belongs in
  `docs/architecture/` instead
- `docs/architecture/` — the "why" behind each subsystem's design, one file per topic (see
  its own index) — go here when a change touches non-obvious existing behavior
- [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) — active
  and planned work (backlog lives here, not in a markdown file). `gh issue list` alone
  won't show it — Priority/Size/Status live on the Project, not the issue: use
  `gh project item-list 3 --owner jonathanstelman` (or the web view) when deciding
  what's actually next, not just what's open.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run lint` — oxlint (no test suite exists)
