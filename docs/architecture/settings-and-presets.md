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
- `activePresetKey` tracks which `PRESETS` entry was last applied, so its `description`
  can stay shown below the preset row in `Controls.jsx`. Cleared by the same manual edits
  that clear `enabledPairs` (toggling a type/root, enabling custom bank), since
  "customize from here" means the preset no longer describes what's actually selected.
- **`min`/`max` on `<input type="number">` do not bind.** They constrain the spinner
  buttons and form validation only — a *typed* value goes straight to `onChange`. Every
  numeric handler used to do `Number(e.target.value)` and write the result to settings, so
  typing 99999 into Duration put 99999 into `maxBeats`, and `NowPlaying`/`PipConsole`
  build their beat grid with `Array.from({ length: totalBeats })` — the display tried to
  render 99999 cells and the app fell over. It persisted too, so a reload brought it back.
  Bounds now live in `NUMERIC_LIMITS` and are applied in two places: `NumberField` on
  edit, and `loadSettings` on read. Don't drop the load-side clamp — it's what stops a
  value already written by the old behaviour (or hand-edited in localStorage) from
  surviving.
- **The lower bound is deliberately not enforced while typing.** Any prefix of a valid
  number can be below the minimum — going from a tempo of 30 to 120 passes through "1"
  and "12", and clearing the field passes through "". Clamping each keystroke up to `min`
  pins the field to its minimum and makes it impossible to type a new value at all
  (backspacing from 30 gives "3", which snaps back to 30). Below-minimum text stays in
  `NumberField`'s draft and simply isn't committed; blur resolves it. The *upper* bound is
  safe to enforce live, since extra digits only push further over.
- **`minBeats` caps two below `maxBeats`** (30 and 32) so the `min + 2` that
  `Randomize beats` seeds always lands inside the range's own ceiling. That's what lets
  the toggle write `maxBeats` and nothing else. An earlier single shared cap had no room
  to widen upward at the ceiling and widened *downward* instead, silently rewriting a
  `minBeats` the user had set — don't reintroduce a scheme where turning a toggle on can
  move a value the user typed.
- An inverted range needs no guard at the input layer: `pickRandomDuration` normalises
  with `lo = min(a, b)` / `hi = max(a, b)`.
