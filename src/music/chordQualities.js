// Chord qualities: semitone intervals from the root, in stacking order. `hasKeySignature`
// marks the ones that imply an actual major/minor key (as opposed to symmetric chords
// like diminished/augmented, which don't sit "in a key") — used to keep random roots to
// key signatures with fewer than 7 sharps/flats (see music/notes.js). `spelling` is
// which key the root is spelled from — see docs/architecture/music-theory.md's "Root
// spelling" for why dim/ø sit in the minor family.
export const CHORD_QUALITIES = [
  { key: 'maj', label: 'Major', category: 'Triads', intervals: [0, 4, 7], hasKeySignature: true, spelling: 'major' },
  { key: 'min', label: 'Minor', category: 'Triads', intervals: [0, 3, 7], hasKeySignature: true, spelling: 'minor' },
  { key: 'dim', label: 'Diminished', category: 'Triads', intervals: [0, 3, 6], spelling: 'minor' },
  { key: 'aug', label: 'Augmented', category: 'Triads', intervals: [0, 4, 8], spelling: 'major' },

  { key: 'maj7', label: 'Major 7', category: 'Seventh Chords', intervals: [0, 4, 7, 11], spelling: 'major' },
  { key: 'min7', label: 'Minor 7', category: 'Seventh Chords', intervals: [0, 3, 7, 10], spelling: 'minor' },
  { key: 'dom7', label: 'Dominant 7', category: 'Seventh Chords', intervals: [0, 4, 7, 10], spelling: 'major' },
  { key: 'm7b5', label: 'Half-Diminished (m7♭5)', category: 'Seventh Chords', intervals: [0, 3, 6, 10], spelling: 'minor' },
  { key: 'dim7', label: 'Diminished 7', category: 'Seventh Chords', intervals: [0, 3, 6, 9], spelling: 'minor' },
];
