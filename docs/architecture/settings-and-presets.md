# Settings & presets (`src/hooks/useSettings.js`, `src/music/pool.js`)

- `applyPreset` replaces `enabledTypes` outright — a clean reset to exactly a preset's
  categories, not a merge with whatever's already enabled. The manual mode/advanced
  checkboxes remain the "customize from here" path afterward. Only Beginner also touches
  `bpm`; the rest are pure type selections.
- Guitar is the odd preset out: it sets an explicit `{rootPc, typeKey}` pair list
  (`GUITAR_OPEN_CHORD_PAIRS`) instead of composing `enabledTypes`/`enabledRoots`. The
  real open-chord set is asymmetric (no Cm/Gm — not open-position shapes), which a
  uniform "these roots" × "these qualities" filter can't express. Unlike the other
  presets, it deliberately leaves `enabledTypes`/`enabledRoots` untouched, so
  "customize from here" (any manual checkbox edit) falls back to whatever general
  filter was set before Guitar was picked, rather than to Guitar's own pairs.
- `enabledRoots` (the general root filter) is intersected with each type's
  `hasKeySignature`-valid roots inside `pickRandomTonalCenter`, not applied on its own —
  a root selection that doesn't intersect a type's valid roots at all falls back to the
  type's full valid set rather than picking from an empty pool.
