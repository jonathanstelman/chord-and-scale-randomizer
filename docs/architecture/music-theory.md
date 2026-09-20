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
  display. Don't collapse these into one function — and don't call the display one from
  a component: what the user sees goes through `spelling.js` (below), which picks the
  spelling by context. `notes.js` only knows the major-key one.
- `voicing.js` turns a root + interval list into actual voiced notes spread across
  octaves (root low, everything else stacked above), and separately
  `padToSimpleArpeggioLength` pads an arpeggio's note count up to 1/2/4/8 — the set of
  lengths that divide evenly into 8 32nd-notes per beat. This is load-bearing: it's what
  keeps the arpeggiator from drifting out of phase with the beat on chords whose note
  count isn't already a power of two (e.g. a 3-note triad).

## Root spelling (`spelling.js`)

**A pitch is named by the key it's in; a bare pitch class gets both names; what the user
typed is never re-spelled.** Before #62 every pitch class had one display spelling, the
major-key one (`D♭ E♭ F♯ A♭ B♭`), so the app showed D♭ Minor (a key nobody spells —
eight flats), A♭ Phrygian, and "in D♭ Minor" whose ♭7 it then spelled C♭. Accuracy is
where this app sets itself apart, so the rule is applied everywhere a root is named,
through one function, `spellRoot(pc, type)`, keyed on a `spelling` field every type
carries:

- **`'major'`** — Major, Major 7, Dominant 7, Augmented: the root's own major key, i.e.
  `notes.js`'s table (fewest accidentals as a major tonic). D♭ Major.
- **`'minor'`** — Minor, Minor 7, Diminished, Half-Diminished, Diminished 7: the root is
  the 6th degree of its relative major and inherits that key's spelling. C♯ Minor (from
  E), G♯ Minor 7 (from B). Diminished and half-diminished don't sit in a key, but their
  third is minor and they function as vii of the key a semitone up (C♯ø7 in D major), so
  the sharp side is what a student meets on the page.
- **`'mode'`** — the 21 heptatonic scale types: find the parent scale's tonic (root −
  `PARENT_SCALE_DEGREES[family][degreeIndex − 1]`), spell *it* by its key (major for the
  diatonic modes, minor for the melodic- and harmonic-minor families), then read the
  root off that letter as the `degreeIndex`-th degree — the same letter arithmetic
  `degreeNoteName` uses for a target. C♯ Dorian (B major), G♭ Lydian (D♭ major), C♯
  Lydian Dominant (G♯ melodic minor).
- **`'both'`** — symmetric scales, `PURE_TONE_TYPE`, and no type at all: no key, so both
  names on a black key, sharp first: C♯ / D♭ Whole Tone. Every picker uses this too
  (`bothNames`): a pitch class genuinely has both names until a key decides, and it's
  what a beginner sees on a keyboard diagram. So the Roots grid says "C♯ / D♭" while the
  display says "C♯ Minor" — that's the point, not a disagreement.

**Roots never carry E♯, B♯, F♭, C♭ or a double accidental.** The mode derivation
strictly produces them (the 7th mode of F♯ melodic minor is E♯ Altered; the 7th of G♯
harmonic minor is F𝄪 Super Locrian 𝄫7) and `spellAsDegreeOf` returns null for them, so
`spellRoot` falls back to the major-key name: F Altered, G Super Locrian 𝄫7. Jazz names
these modes for the chord they're played over, and no root should appear that isn't a
key a student has heard of. *Degrees* are different — a ♭3 in D♭ major is F♭, and
`degreeNoteName` keeps it — because a degree's letter is fixed by its number and the
accidental is the information.

**The F♯/G♭ tie propagates.** `notes.js` breaks the six-accidental tie toward F♯, so the
minor rule gives D♯ Minor (relative of F♯ major), not E♭ Minor. Both are six
accidentals; consistency with the major-key table won, and `spelling.test.js` pins it.
Flip `PITCH_CLASS_SPELLING[6]` and both move together.

**Scale keys.** `spellScaleTonic(pc, scaleKey)` is the tonic of a key defined by a scale
type — the Scale Degrees drone and Pure Tone's Scale mode — and `degreeNoteName` takes
that *spelled* tonic rather than re-deriving a letter from the pitch class, so the two
rules can't drift: D♭ + Aeolian is "in C♯ Minor" and its degrees run C♯ D♯ E F♯ G♯ A B.
A symmetric scale, an unknown key, or Chromatic mode has no key to spell from and takes
the major-key name, since its degrees are labeled major-relative anyway.

**The custom chord bank is exempt.** The parser records the typed root as `rootName`
(`typedRootName`, glyphs normalised, spelling kept) and it rides on the pair through
`pairToTonalCenter` to the segment, so "Dbm" is D♭ Minor in the "Parsed …" echo *and* on
the display when it plays. A student working through a tune that modulates has reasons
for a spelling the rule would call wrong, and it is not the app's place to fix it.
App-defined pair lists (Beginner, Guitar) carry no `rootName` and take the rule. Entries
persisted before #62 have no `rootName` either and fall back the same way.

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
for a non-heptatonic scale in Scale mode, where every label is fallback anyway.

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
every target. The *played* note names come from `pitchClassToNoteName`, which is
key-blind (F♯, never G♭) — Tone.js only needs a pitch. The *displayed* note name does
not: `degreeNoteName` spells it from the degree, because the degree already fixes the
letter (tonic letter + degree − 1) and the pitch class then fixes the accidental. That's
what makes the 7th of E major read D♯ rather than the E♭ the key-blind spelling gives —
the first thing a musician noticed in the first session — and it falls out of the same
major-relative labeling: E♯ in F♯ major, B𝄫 for Super Locrian's 𝄫7, G for a Chromatic
♭3 in E. The tonic it reads from is the *spelled* one (`spellScaleTonic`, "Root
spelling" above), so C♯ minor's degrees start from C, not D♭.
