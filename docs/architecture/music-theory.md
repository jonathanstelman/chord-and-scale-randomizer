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

## Scale-degree spelling (`scaleDegrees.js`)

The Scale Degrees tab labels a target pitch relative to the drone's tonic ("♭3", "♯4").
`degreeLabel` returns `{ number, accidental }` and `formatDegree` turns that into text, so
the rule lives in one place and the display and PiP console can't spell the same pitch
two ways.

**Heptatonic scales spell their own tones, relative to *major*.** If the chosen scale has
seven degrees and the pitch is its *k*-th tone, it is degree *k+1*, and the accidental is
its distance from the major scale's degree of the same number (`MAJOR_DEGREE_OFFSETS`).
Two things fall out of measuring against major rather than against the scale's parent:

- Every 7-note scale shows each number 1–7 exactly once, so a session in Locrian still
  has a "5" (it's ♭5), and the numbers stay a stable frame across modes.
- The labels reproduce the mode names for free, without a per-mode spelling table:
  Locrian's 6th semitone reads ♭5, Lydian's reads ♯4, Phrygian's 1st reads ♭2,
  "Lydian ♯2" gets its ♯2, and "Super Locrian 𝄫7" gets a genuine 𝄫7 (accidental −2).
  `scaleDegrees.test.js` pins all of this, and separately pins that no family produces
  an accidental outside 𝄫..𝄪 — the glyph map assumes that range.

**Everything else uses one fixed chromatic spelling**: `1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7`
(`FALLBACK_DEGREE_LABELS`). That covers every pitch in Chromatic mode (which has no
scale — `scaleDegreesKey` routes it through Ionian, whose own tones spell identically to
the table, so the result is the table throughout) and every pitch of a non-heptatonic
scale (whole tone has 6 tones, the diminished scales 8 — mapping
them onto 1–7 would either skip a number or double one, so they don't get the heptatonic
treatment at all). Flats everywhere with ♯4 as the single sharp is the convention
functional ear-training material generally settles on: the flat degrees read as borrowed
from the parallel minor modes, while the raised fourth is heard as a leading tone into 5
rather than a lowered fifth. Don't make the fallback key-aware — Chromatic mode has no
scale to be aware of (docs/architecture/randomizer.md's Scale Degrees section says why),
and the fallback being the same in every key is what makes it learnable.

The two rules never collide: a label means "major degree *n* shifted by *a* semitones",
which is a unique interval above the tonic, so in Chromatic mode the twelve pitches always
get twelve distinct labels whatever the scale (also pinned in the tests). Since Chromatic
always uses the table, a mixed run of scale-spelled and fallback labels can only occur
for a non-heptatonic scale in Diatonic mode, where every label is fallback anyway.

**Solfège is do-based in every scale.** `do re mi fa sol la ti`, flats `ra me se le te`,
sharps `di ri fi si li`. Minor modes therefore run `do re me fa sol le te`, not la-based —
that's a listed non-goal in issue #8, not an oversight. A label with no standard syllable
(any 𝄫/𝄪, and the single alterations ♭1 ♭4 ♯3 ♯7) renders as its numeric form even in
solfège mode, so "Super Locrian 𝄫7" reads `do ra me ♭4 se le 𝄫7`. Numbers never carry a ♮:
a bare "3" already means "as in major", and a natural sign would imply a contrast the
display never draws.

**Registers.** The drone's tonic is in octave 3 and targets are `interval + 12` semitones
above it, so degree 1 is the octave above the drone, never a unison with it. Both
`droneNotes` and `targetNoteName` carry into the next octave when a pitch class wraps past
B instead of folding back down: a fifth above B3 is F♯4, and a B3 drone's targets run
B4 … B♭5. `TARGET_OCTAVE` is the octave the *tonic* target lands in, not a ceiling on
every target. Note names come from `pitchClassToNoteName`, which is key-blind (F♯, never
G♭) — key-aware spelling of the absolute note name is another listed non-goal in #8.
