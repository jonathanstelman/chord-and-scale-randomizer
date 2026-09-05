# Architecture

The "why" behind each subsystem's design — non-obvious decisions and gotchas, not a
restatement of what the code already says. Read the file for whatever you're touching,
not all of them. See [`../guidelines.md`](../guidelines.md) for stack/conventions/testing
and [`../product.md`](../product.md) for vision.

- [`music-theory.md`](./music-theory.md) — `src/music/`: chord/scale vocabulary,
  key-signature filtering, note spelling, voicing/arpeggio-length padding
- [`audio.md`](./audio.md) — `src/audio/engine.js`: gain staging, the arpeggiator, the
  iOS mute-switch workaround
- [`randomizer.md`](./randomizer.md) — `src/hooks/useRandomizer.js` + top-level
  components: the beat clock, phase pregeneration, pluggable chord sources
- [`settings-and-presets.md`](./settings-and-presets.md) — `src/hooks/useSettings.js` +
  `src/music/pool.js`: presets, Guitar mode, the roots filter

Adding a new non-obvious decision? Put it in the topic file it belongs to, inline,
matching the style already there (state the gotcha, state why, state what not to do
about it) — don't start a separate decisions log for it.
