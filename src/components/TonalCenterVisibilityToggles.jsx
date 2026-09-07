// A veil you draw over a reading, not a checkbox: ▣ is a clear pane, ▨ is the same pane
// hatched over. Plain glyphs rather than emoji, matching the app's ▶ ■ ▸ ▷ ☀ ☾ language.
//
// Rendered in the system face for the same reason ThemeToggle's ☀/☾ are — these render
// thin and undersized in Work Sans (see .tonal-center-veil in App.css).
const SHOWN = '▣';
const HIDDEN = '▨';

// Sits in the display's top corners, each above the reading it governs: current is the
// left-hand reading, next is the right-hand one, so the toggles mirror that order.
export default function TonalCenterVisibilityToggles({ settings, updateSettings }) {
  const toggle = (key, label) => {
    const isShown = settings[key];
    const side = key === 'showCurrent' ? 'current' : 'next';
    // The word names the *action*, matching how the transport's label reads ("Play"
    // does the playing). It's aria-hidden because the button is already named — and
    // that name has to contain the visible word, or a speech-input user saying "click
    // Hide" won't match the control (WCAG 2.5.3, Label in Name).
    const action = isShown ? 'Hide' : 'Show';

    return (
      <span className={`tonal-center-veil-group tonal-center-veil-group--${side}`}>
        <button
          type="button"
          className={`tonal-center-veil tonal-center-veil--${side}`}
          aria-pressed={isShown}
          aria-label={`${action} ${label} tonal center`}
          title={`${action} ${label}`}
          onClick={() => updateSettings({ [key]: !isShown })}
        >
          <span aria-hidden="true">{isShown ? SHOWN : HIDDEN}</span>
        </button>
        <span className="veil-label" aria-hidden="true">{action}</span>
      </span>
    );
  };

  return (
    <>
      {toggle('showCurrent', 'current')}
      {toggle('showNext', 'next')}
    </>
  );
}
