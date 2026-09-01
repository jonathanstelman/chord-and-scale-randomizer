import { CHORD_QUALITIES } from './chordQualities';
import { noteNameToPitchClass } from './notes';

// Every way we accept spelling a chord quality, folded to a CHORD_QUALITIES key. Matched
// case-insensitively — there's no real ambiguity once a suffix is 2+ letters ("Maj7" vs
// "MAJ7" vs "maj7" all clearly mean the same thing).
const QUALITY_ALIASES = {
  '': 'maj', maj: 'maj', major: 'maj',
  min: 'min', mi: 'min', minor: 'min', '-': 'min',
  dim: 'dim', diminished: 'dim', '°': 'dim', o: 'dim',
  aug: 'aug', augmented: 'aug', '+': 'aug',
  maj7: 'maj7', major7: 'maj7',
  min7: 'min7', mi7: 'min7', minor7: 'min7', '-7': 'min7',
  dom7: 'dom7', '7': 'dom7',
  m7b5: 'm7b5', 'm7-5': 'm7b5', halfdim: 'm7b5', halfdim7: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5',
  dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
};

// The handful of shorthand spellings where case is the *only* thing distinguishing major
// from minor — checked before the case-insensitive table above, and case-sensitively:
// "M"/"M7" is major, "m"/"m7" is minor. Folding these to lowercase first (as the rest of
// the aliases are) would make "M7" collide with "m7" and silently turn every major-7 the
// user typed that way into a minor-7.
const CASE_SENSITIVE_QUALITY_ALIASES = {
  M: 'maj', m: 'min', M7: 'maj7', m7: 'min7',
};

const VALID_QUALITY_KEYS = new Set(CHORD_QUALITIES.map((q) => q.key));

// A leading root letter (A-G) + optional single accidental, everything else is quality.
const TOKEN_PATTERN = /^([A-Ga-g])([#b♯♭]?)\s*(.*)$/;

function resolveQuality(suffix) {
  const trimmed = suffix.trim();
  if (trimmed in CASE_SENSITIVE_QUALITY_ALIASES) return CASE_SENSITIVE_QUALITY_ALIASES[trimmed];
  const key = QUALITY_ALIASES[trimmed.toLowerCase()];
  return key && VALID_QUALITY_KEYS.has(key) ? key : null;
}

// Parses one chord symbol ("Em", "e min", "G7", "Bb-7", ...) into { rootPc, typeKey }, or
// returns null if it doesn't look like a chord at all.
export function parseChordToken(raw) {
  const trimmed = raw.trim();
  const match = TOKEN_PATTERN.exec(trimmed);
  if (!match) return null;
  const [, letter, accidental, suffix] = match;
  const rootPc = noteNameToPitchClass(letter, accidental);
  const typeKey = resolveQuality(suffix);
  if (rootPc === null || typeKey === null) return null;
  return { rootPc, typeKey };
}

// Splits free text into individual chord symbols (comma- or newline-separated, either
// works) and parses each one. `entries` holds only the successfully parsed chords, in
// the order they were written — order matters for "ordered" custom-bank mode. `errors`
// lists the raw text of anything that didn't parse, so the caller can decide whether a
// partial parse is good enough to use (the UI currently requires a full parse — see
// Controls.jsx — but the split is here in case that changes later).
export function parseCustomBank(text) {
  const tokens = text.split(/[,\n]+/).map((t) => t.trim()).filter(Boolean);
  const entries = [];
  const errors = [];
  for (const raw of tokens) {
    const parsed = parseChordToken(raw);
    if (parsed) entries.push({ ...parsed, raw });
    else errors.push(raw);
  }
  return { entries, errors };
}
