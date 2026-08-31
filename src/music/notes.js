// Circle-of-fifths spelling for each pitch class, as a major-scale tonic: the name with
// the fewest accidentals (ties, like F#/Gb at 6 each, just pick one). This is what turns
// "A# major" (which nobody spells that way — 10 sharps) into "Bb major" (2 flats).
const PITCH_CLASS_SPELLING = [
  { name: 'C', accidentals: 0 },
  { name: 'Db', accidentals: 5 },
  { name: 'D', accidentals: 2 },
  { name: 'Eb', accidentals: 3 },
  { name: 'E', accidentals: 4 },
  { name: 'F', accidentals: 1 },
  { name: 'F#', accidentals: 6 },
  { name: 'G', accidentals: 1 },
  { name: 'Ab', accidentals: 4 },
  { name: 'A', accidentals: 3 },
  { name: 'Bb', accidentals: 2 },
  { name: 'B', accidentals: 5 },
];

function spellingFor(pc) {
  return PITCH_CLASS_SPELLING[((pc % 12) + 12) % 12];
}

export function pitchClassToName(pc) {
  return spellingFor(pc).name;
}

// Same spelling, but with the proper Unicode accidental glyphs (♯ ♭) instead of the
// ASCII "#"/"b" stand-ins — for anything shown to the user. Tone.js's note parser only
// understands the ASCII forms, so pitchClassToName/pitchClassToNoteName above stay
// ASCII; this is display-only.
export function pitchClassToDisplayName(pc) {
  return spellingFor(pc).name.replace('#', '♯').replace(/b$/, '♭');
}

export function pitchClassAccidentals(pc) {
  return spellingFor(pc).accidentals;
}

// Tone.js note string, e.g. pitchClassToNoteName(10, 4) -> "Bb4"
export function pitchClassToNoteName(pc, octave) {
  return `${pitchClassToName(pc)}${octave}`;
}
