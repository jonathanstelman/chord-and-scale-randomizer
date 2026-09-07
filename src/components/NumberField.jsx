import { useState } from 'react';

// A number input that actually enforces its bounds — the HTML min/max attributes don't,
// and `loadSettings` re-applies the same limits on read. Both halves and what went wrong
// without them are in docs/architecture/settings-and-presets.md.
//
// Width comes from the digits `max` needs rather than one size for every field, so a
// two-digit setting doesn't get a box that comfortably fits five.
export default function NumberField({ value, min, max, onCommit, ...rest }) {
  // While the field has focus its text can be mid-edit — '' after a backspace, or a
  // partial number — and neither is something to write to settings. Holding that text
  // here lets the field show what was typed without committing it, and dropping it on
  // blur snaps the field back to whatever the setting actually holds.
  const [draft, setDraft] = useState(null);

  const commit = (n) => onCommit(Math.min(max, Math.max(min, Math.round(n))));

  const handleChange = (e) => {
    const raw = e.target.value;
    setDraft(raw);
    if (raw === '') return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;

    if (parsed > max) {
      // Safe to enforce live: typing more digits only ever pushes further over, so
      // there's no keystroke on the way to a valid number that this would block.
      setDraft(String(max));
      onCommit(max);
      return;
    }
    // Deliberately *not* clamped up to `min` here: a prefix of a valid number is often
    // below it ("1" and "12" on the way to 120), and clamping each keystroke would pin
    // the field to its minimum and make it impossible to type into. Below-minimum text
    // stays in the draft uncommitted until blur.
    if (parsed >= min) commit(parsed);
  };

  // Blur is where a half-typed value gets resolved: too low becomes the minimum, and
  // empty or unparseable reverts to whatever the setting actually holds.
  const handleBlur = () => {
    const parsed = Number(draft);
    if (draft !== null && draft !== '' && !Number.isNaN(parsed)) commit(parsed);
    setDraft(null);
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      // draft can legitimately be '', which is why this is ?? and not ||.
      value={draft ?? value}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{ '--field-digits': String(max).length }}
      {...rest}
    />
  );
}
