# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs

Read the one relevant to what you're doing, not all of them — that's the point of the split.

- `docs/product.md` — vision, audience, core user flows, explicit out-of-scope
- `docs/guidelines.md` — stack, conventions, testing approach; short enough to read in full
- `docs/comment-conventions.md` — when a comment has outgrown the code and belongs in
  `docs/architecture/` instead. Check new/edited comments against this before finishing
  a change, not only once one visibly balloons — and if a comment points at a doc
  section, confirm that section actually contains what it claims (add it there first if
  not) rather than leaving a pointer to nothing.
- `docs/architecture/` — the "why" behind each subsystem's design, one file per topic (see
  its own index) — go here when a change touches non-obvious existing behavior
- `docs/design/` — working material behind visual design decisions: generators, reference
  images, comparison sheets. Nothing here ships or runs at build time; it exists so a
  motif can be *changed* without redoing the design conversation. Read the relevant
  `README.md` there before altering artwork the app renders.
- `docs/ui-ux-overhaul.md` — build order/dependency chain for the practice-mode UI/UX
  overhaul (issues #21–#31); the Project's Priority/Size fields don't capture this on
  their own, so check here before picking up the next piece of that initiative
- [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) — active
  and planned work (backlog lives here, not in a markdown file). `gh issue list` alone
  won't show it — Priority/Size/Status live on the Project, not the issue: use
  `gh project item-list 3 --owner jonathanstelman` (or the web view) when deciding
  what's actually next, not just what's open.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run lint` — oxlint (no test suite exists)
