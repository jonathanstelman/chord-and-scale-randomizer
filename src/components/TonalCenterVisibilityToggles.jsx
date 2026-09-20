// A veil you draw over a readout, not a checkbox: ▣ is a clear pane, ▨ is the same pane
// hatched over. Plain glyphs rather than emoji, matching the app's ▶ ■ ▸ ▷ ☀ ☾ language.
//
// Rendered in the system face for the same reason ThemeToggle's ☀/☾ are — these render
// thin and undersized in Work Sans (see .tonal-center-veil in App.css).
const SHOWN = '▣';
const HIDDEN = '▨';

// Sits in the display's top corners, each above the readout it governs: current is the
// left-hand readout, next is the right-hand one, so the toggles mirror that order. The
// Scale Degrees tab adds a third, over the note name beneath the current readout — it
// follows the current toggle in the left corner for that reason. Each corner is one
// flex row the toggles flow inside, so a second toggle can't be hand-placed into the
// other corner's space at some width.
const SIDES = { showCurrent: 'current', showNext: 'next', showNoteName: 'note' };
// What the accessible name calls the thing veiled; the visible tooltip uses the shorter
// label passed to toggle().
const VEILED_NAMES = {
  showCurrent: 'current tonal center', showNext: 'next tonal center', showNoteName: 'note name',
};

export default function TonalCenterVisibilityToggles({ settings, updateSettings }) {
  const toggle = (key, label) => {
    const isShown = settings[key];
    const side = SIDES[key];
    // The word names the *action*, matching how the transport's label reads ("Play"
    // does the playing). It's aria-hidden because the button is already named — and
    // that name has to contain the visible word, or a speech-input user saying "click
    // Hide" won't match the control (WCAG 2.5.3, Label in Name).
    const action = isShown ? 'Hide' : 'Show';
    // Two toggles share the left corner on Scale Degrees, so the second one's word says
    // what it veils — a bare "Hide" beside another "Hide" tells nobody anything.
    const word = key === 'showNoteName' ? `${action} note` : action;

    return (
      <span className={`tonal-center-veil-group tonal-center-veil-group--${side}`}>
        <button
          type="button"
          className={`tonal-center-veil tonal-center-veil--${side}`}
          aria-pressed={isShown}
          aria-label={`${action} ${VEILED_NAMES[key]}`}
          title={`${action} ${label}`}
          onClick={() => updateSettings({ [key]: !isShown })}
        >
          <span aria-hidden="true">{isShown ? SHOWN : HIDDEN}</span>
        </button>
        <span className="veil-label" aria-hidden="true">{word}</span>
      </span>
    );
  };

  return (
    <>
      <span className="tonal-center-veil-corner tonal-center-veil-corner--left">
        {toggle('showCurrent', 'current')}
        {settings.activeTab === 'scaleDegrees' && toggle('showNoteName', 'note name')}
      </span>
      {/* Nothing to veil when the queue is switched off entirely. */}
      {settings.queueDepth > 0 && (
        <span className="tonal-center-veil-corner tonal-center-veil-corner--right">
          {toggle('showNext', 'next')}
        </span>
      )}
    </>
  );
}
