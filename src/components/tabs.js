// The three practice tabs, in display order, each with the accent that identifies it —
// the tab's underline and the idle card's chair both take it. cobalt / brass / flame
// mean *these three modes*; see docs/architecture/design-language.md, "The accents".
export const TABS = [
  { key: 'randomizer', label: 'Chords & Scales', accent: 'cobalt' },
  { key: 'pureTone', label: 'Pure Tone', accent: 'brass' },
  { key: 'scaleDegrees', label: 'Scale Degrees', accent: 'flame' },
];

export function tabAccent(tabKey) {
  return TABS.find((t) => t.key === tabKey)?.accent ?? 'cobalt';
}
