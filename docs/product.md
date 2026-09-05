# Product Vision

## What this is

A browser-based ear-training tool that plays a randomized sequence of tonal centers —
chords, and harmony implied by scales — at a configurable tempo, so a musician can
practice reacting to change: naming what just came up, playing along with it, or finding
it on their instrument. No accounts, no backend — a single static page; all state lives
in the browser (`localStorage`).

Today it's one practice mode built around chord/scale identification. [Issues #6-#8 on
the GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) scope
splitting this into separate practice-mode tabs (a pitch-finding drill, a
functional-ear-training drone mode) aimed at a wider range of skill levels than the
current mode alone serves — see "Who it's for" below for why that split matters.

## Who it's for

Any music student, at any level — self-taught learners, students practicing between
lessons, and teachers running it live in a lesson or classroom. No one persona takes
priority over the others; a feature that only makes sense for one of them (e.g.
classroom-specific controls) needs a reason beyond "useful to me."

## Core user flows

- **Focused solo practice** — sit down, headphones in, run a session as a deliberate
  stretch of ear-training drill.
- **Warm-up** — a few minutes running before picking up the instrument for real practice
  or playing.

Classroom/group use and background/ambient listening have come up as ideas but aren't
confirmed flows to design around yet — don't assume either without asking.

## Explicitly out of scope

- **A native or mobile app.** Stays a responsive web app; no App Store/Play Store
  distribution.
- **MIDI input/output.** No hardware instrument connection — audio stays browser-only,
  in and out.

Anything not listed here (accounts, notation display, social features, etc.) isn't
ruled in or out — it just hasn't been decided. Ask rather than assume.

## Where the roadmap lives

This file is about *why*; it doesn't track *what's next*. Active and planned work lives
on the [GitHub Project](https://github.com/users/jonathanstelman/projects/3/views/1) as
issues; architecture decisions live in [`docs/architecture/`](./architecture/README.md).

---
*Living document — update this when a decision changes product direction, not just when
someone asks about it.*
