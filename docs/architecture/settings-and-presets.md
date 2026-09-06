# Settings & presets (`src/hooks/useSettings.js`, `src/music/pool.js`)

- `applyPreset` replaces `enabledTypes` outright — a clean reset to exactly a preset's
  categories, not a merge with whatever's already enabled. The manual mode/advanced
  checkboxes remain the "customize from here" path afterward.
- Guitar and Beginner are the two presets that set an explicit `{rootPc, typeKey}` pair
  list (`enabledPairs`) instead of composing `enabledTypes`/`enabledRoots` — the
  categories-only schema can't express "these specific types on these specific roots".
  Guitar's real open-chord set is asymmetric (no Cm/Gm — not open-position shapes);
  Beginner's is major/minor triads on natural roots only, narrower than the 'Triads'
  category (all 4 qualities × all 12 roots). Both deliberately leave
  `enabledTypes`/`enabledRoots` untouched, so "customize from here" (any manual
  checkbox edit) falls back to whatever general filter was set before the preset was
  picked, rather than to the preset's own pairs. Beginner also touches `bpm`; no other
  preset does.
- `enabledRoots` (the general root filter) is intersected with each type's
  `hasKeySignature`-valid roots inside `pickRandomTonalCenter`, not applied on its own —
  a root selection that doesn't intersect a type's valid roots at all falls back to the
  type's full valid set rather than picking from an empty pool.
