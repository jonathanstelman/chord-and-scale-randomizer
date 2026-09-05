// Chord qualities: semitone intervals from the root, in stacking order. `hasKeySignature`
// marks the ones that imply an actual major/minor key (as opposed to symmetric chords
// like diminished/augmented, which don't sit "in a key") — used to keep random roots to
// key signatures with fewer than 7 sharps/flats (see music/notes.js).
export const CHORD_QUALITIES = [
  { key: 'maj', label: 'Major', category: 'Triads', intervals: [0, 4, 7], hasKeySignature: true },
  { key: 'min', label: 'Minor', category: 'Triads', intervals: [0, 3, 7], hasKeySignature: true },
  { key: 'dim', label: 'Diminished', category: 'Triads', intervals: [0, 3, 6] },
  { key: 'aug', label: 'Augmented', category: 'Triads', intervals: [0, 4, 8] },

  { key: 'maj7', label: 'Major 7', category: 'Seventh Chords', intervals: [0, 4, 7, 11] },
  { key: 'min7', label: 'Minor 7', category: 'Seventh Chords', intervals: [0, 3, 7, 10] },
  { key: 'dom7', label: 'Dominant 7', category: 'Seventh Chords', intervals: [0, 4, 7, 10] },
  { key: 'm7b5', label: 'Half-Diminished (m7♭5)', category: 'Seventh Chords', intervals: [0, 3, 6, 10] },
  { key: 'dim7', label: 'Diminished 7', category: 'Seventh Chords', intervals: [0, 3, 6, 9] },
];
