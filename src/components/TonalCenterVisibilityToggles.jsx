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
    return (
      <button
        type="button"
        className={`tonal-center-veil tonal-center-veil--${key === 'showCurrent' ? 'current' : 'next'}`}
        aria-pressed={isShown}
        aria-label={`${isShown ? 'Hide' : 'Show'} ${label} tonal center`}
        title={`${isShown ? 'Hide' : 'Show'} ${label}`}
        onClick={() => updateSettings({ [key]: !isShown })}
      >
        <span aria-hidden="true">{isShown ? SHOWN : HIDDEN}</span>
      </button>
    );
  };

  return (
    <>
      {toggle('showCurrent', 'current')}
      {toggle('showNext', 'next')}
    </>
  );
}
