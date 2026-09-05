# Music theory (`src/music/`)

Pure data, decoupled from audio/UI. If a function here needs to import from `audio/` or
`components/`, that's a sign it belongs in one of those instead.

- `chordQualities.js` / `scaleFamilies.js` define the raw vocabulary (triads, sevenths,
  and scale-family modes with their step patterns). Scale modes are generated
  programmatically by rotating a parent scale's step pattern, not hand-written per mode.
- `pool.js` merges both into `ALL_TONAL_CENTER_TYPES` and does the actual randomization:
  `pickRandomTonalCenter` picks a root + type, respecting each type's `hasKeySignature`
  flag (major/minor/modal types are restricted to roots with a sane key signature — see
  `notes.js`'s circle-of-fifths spelling table — so you get "B♭" not "A♯"; symmetric
  scales/dim/aug aren't restricted since they don't imply a key).
- `notes.js` has two spellings per pitch class on purpose: `pitchClassToName`/
  `pitchClassToNoteName` stay ASCII ("Bb4") because that's all Tone.js's note parser
  accepts, while `pitchClassToDisplayName` swaps in the real Unicode glyphs (♭ ♯) for
  anything shown to the user. Don't collapse these into one function.
- `voicing.js` turns a root + interval list into actual voiced notes spread across
  octaves (root low, everything else stacked above), and separately
  `padToSimpleArpeggioLength` pads an arpeggio's note count up to 1/2/4/8 — the set of
  lengths that divide evenly into 8 32nd-notes per beat. This is load-bearing: it's what
  keeps the arpeggiator from drifting out of phase with the beat on chords whose note
  count isn't already a power of two (e.g. a 3-note triad).
