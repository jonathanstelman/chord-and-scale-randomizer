import { useState } from 'react';

// A number input that actually enforces its bounds.
//
// `min`/`max` on <input type="number"> only constrain the spinner buttons and form
// validation — a *typed* value passes straight through to onChange. Since every handler
// here did `Number(e.target.value)` and wrote the result to settings, typing 99999 into
// Duration put 99999 into `maxBeats`, and both NowPlaying and PipConsole build their beat
// grid with `Array.from({ length: totalBeats })` — so the display tried to render 99999
// cells and the app fell over. The bounds have to be applied in JS to mean anything.
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
    // Deliberately *not* clamped up to `min` here. Any prefix of a valid number can be
    // below the minimum — going from 30 to 120 passes through "1" and "12", and going
    // anywhere passes through "" — so clamping on each keystroke pins the field to its
    // minimum and makes it impossible to type a new value at all. Below-minimum text is
    // left in the draft and simply not committed, so the app keeps using the last good
    // value until blur resolves it.
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
