// Two drawn bars, not the ‖ character: at the PiP key's 0.7rem the character's strokes
// merge into a rectangle indistinguishable from ■ on iOS's system face. Sized in em so
// the same mark serves the display's deck and the console; the px floor keeps the bars
// and the gap from rounding away at small sizes. ▶ and ■ stay as characters — they hold
// up at both sizes.
export default function PauseGlyph() {
  return (
    <span className="glyph-pause" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}
