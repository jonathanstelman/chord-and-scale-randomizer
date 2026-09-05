# Comment Conventions

One specific thing the linter can't catch: when an in-code comment has grown past
explaining *this line* and started reconstructing a design decision that belongs in
[`docs/architecture/`](./architecture/README.md) instead. Not a general style guide —
if an unrelated code-style preference comes up later (quote style, import order,
whatever), it earns its own doc rather than getting folded in here.

## Comment scope: local fact vs. architecture entry

A comment in the code should tell you what you need to safely work with *this* line —
not reconstruct the full decision history behind it. If a comment starts pulling in
cross-file reasoning, alternatives that were tried and rejected, or several unrelated
facts stacked into one block, that's a sign it belongs in
[`docs/architecture/`](./architecture/README.md) instead, with a short pointer left in
its place.

**Rule of thumb**: if deleting a comment would only cost you *historical or
cross-cutting* context (why the system as a whole is shaped this way), it belongs in
`docs/architecture/`. If it would cost you *local* understanding (why this exact line is
written this way), keep it in the code, even if that takes a few lines.

**Found in `src/audio/engine.js` (since fixed) — the worst case so far**, a 24-line
comment reconstructing an entire debugging history, complete with rejected approaches
and external bug-tracker links:

```js
// iOS/iPadOS Safari (and every other browser there — Apple requires them all to embed
// WebKit) puts a page's raw Web Audio API output in the "Ambient" audio session category
// by default, which respects the hardware/software mute switch — unlike native <audio>/
// <video> elements, which get "MediaPlayback" and ignore it. [...]
//
// An earlier version of unlockIOSMediaPlayback() below routed the *actual* synth output
// through a hidden <audio> element (via a MediaStreamAudioDestinationNode) [...]
//
// iOS ties the "MediaPlayback" unlock to the *page's shared audio session* [...]
export const IS_IOS = /* ... */
```

That entire block was, almost word for word, what became
[`docs/architecture/audio.md`](./architecture/audio.md)'s iOS section — the in-code
version and the doc had drifted into being the same essay written twice. Fixed by
trimming to a one-line pointer:

```js
// iOS Safari puts a page's raw Web Audio output in the "Ambient" session category by
// default, which respects the hardware mute switch — see docs/architecture/audio.md for
// why, and for an approach that was tried and rejected before this one.
export const IS_IOS = /* ... */
```

**A smaller, more common version, found in `src/music/pool.js`**: nine lines stacking
four separate facts (replace-vs-merge semantics, a UI detail, a bpm exception, and a
cross-file special case) onto one export:

```js
// One-click starting points layered on top of CORE_MODES: each sets enabledTypes to
// *exactly* its categories (not merged with whatever's already on), so picking one is a
// clean reset. The manual mode/advanced checkboxes remain the "customize from here" path
// afterward. Only Beginner also touches bpm — the rest are pure type selections. Guitar
// is the odd one out: it sets `pairs` instead of `categories` [...]
export const PRESETS = [
```

Fixed the same way:

```js
// One-click starting points layered on top of CORE_MODES — replace-vs-merge semantics
// and Guitar's special case are in docs/architecture/settings-and-presets.md.
export const PRESETS = [
```

**Not every long comment is this smell.** `voicing.js`'s `voiceChord` has a 6-line
comment explaining its octave-stacking algorithm, and it stays — deleting it would cost
you the ability to safely modify that function, not just some background trivia. The
tell isn't length, it's whether the content is *about this line* or *about the system*.

## When trimming a comment into a pointer

Before deleting the long version, check whether every fact in it already exists in the
target `docs/architecture/*.md` file. If something would be lost (an example: the
`chordBaseVolume` crossfade-headroom reasoning wasn't yet in `audio.md` when its comment
got trimmed), add it to the doc *first*, in the same change — don't let a doc-cleanup
pass quietly delete information.
