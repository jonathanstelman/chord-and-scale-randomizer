import { SCALE_TYPES } from '../music/scaleFamilies';
import { pitchClassToDisplayName } from '../music/notes';

function groupScalesByCategory() {
  const groups = new Map();
  for (const t of SCALE_TYPES) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category).push(t);
  }
  return groups;
}

// Category → scale types, in SCALE_TYPES order, for the grouped Scale <select> the Pure
// Tone and Scale Degrees tabs share.
export const SCALE_GROUPS = groupScalesByCategory();

// Only the Scale dropdowns get the familiar-name parenthetical — SCALE_TYPES.label stays
// plain "Ionian"/"Aeolian" for the Chords & Scales tab's Advanced checkboxes and its
// real-time "C Ionian" display, where the extra words would just be clutter. Both tabs
// that pick a single key skew toward solfège practice, where "major"/"natural minor" is
// the more recognizable name.
const SCALE_OPTION_LABEL_OVERRIDES = {
  'diatonic:Ionian': 'Ionian (Major)',
  'diatonic:Aeolian': 'Aeolian (Natural Minor)',
};

export function scaleOptionLabel(type) {
  return SCALE_OPTION_LABEL_OVERRIDES[type.key] ?? type.label;
}

// The everyday name for a key, for the Scale Degrees display's "in C Major" eyebrow: the
// familiar word where one exists, the mode name otherwise ("D Dorian").
const KEY_NAME_OVERRIDES = {
  'diatonic:Ionian': 'Major',
  'diatonic:Aeolian': 'Minor',
};

export function keyDisplayName(rootPc, scaleKey) {
  const type = SCALE_TYPES.find((t) => t.key === scaleKey);
  const scaleName = KEY_NAME_OVERRIDES[scaleKey] ?? type?.label ?? '';
  return `${pitchClassToDisplayName(rootPc)} ${scaleName}`.trim();
}
