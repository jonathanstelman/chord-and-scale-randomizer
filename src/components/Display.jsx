import NowPlaying from './NowPlaying';
import Chair from './Chair';
import TonalCenterVisibilityToggles from './TonalCenterVisibilityToggles';

// The ref goes on the outer `.sleeve`: the card is what leaves the viewport, and that's
// what PipConsole observes. `.sleeve-stage` caps the content measure and has to wrap
// everything, corner controls included — see docs/architecture/randomizer.md's "Settings
// in two columns".
export default function Display({
  ref, settings, updateSettings, current, next, isRunning, beatIndex, totalBeats, isGap,
  onStart, onStop,
}) {
  return (
    <div className="sleeve" ref={ref}>
      <div className="sleeve-stage">
        {/* Only while a session is running: idle, there's no readout to veil, and two
            glyphs floating over an empty card read as decoration. */}
        {isRunning && (
          <TonalCenterVisibilityToggles settings={settings} updateSettings={updateSettings} />
        )}

        {!isRunning && (
          <div className="sleeve-idle">
            <Chair pose="upright" size={78} className="sleeve-idle-chair" />

            {/* A worked example of the real thing, built from the same classes so it
                can't drift from what a session actually looks like. aria-hidden: a
                screen reader announcing "C Major" here would be announcing a chord
                that isn't playing, and the copy below already says what to do. */}
            <div className="idle-sample" aria-hidden="true">
              <span className="idle-sample-tag">Example</span>
              <div className="readout-row">
                <div className="readout readout--current">
                  <span className="chord-name">C Major</span>
                </div>
                <div className="readout readout--next">
                  <span className="readout-eyebrow">Next</span>
                  <span className="chord-name chord-name--next">A Minor</span>
                </div>
              </div>
              <div className="beat-panel">
                <div className="beat-numeral">
                  <span className="beat-numeral-current">1</span>
                  <span className="beat-numeral-total">/ 4</span>
                </div>
                <div className="beat-track">
                  <span className="beat-block beat-block--current" />
                  <span className="beat-block beat-block--upcoming" />
                  <span className="beat-block beat-block--upcoming" />
                  <span className="beat-block beat-block--upcoming" />
                </div>
              </div>
            </div>

            <p className="sleeve-idle-copy">Press play to begin.</p>
          </div>
        )}

        {isRunning && (
          <NowPlaying
            current={current}
            next={next}
            showCurrent={settings.showCurrent}
            showNext={settings.showNext}
            beatIndex={beatIndex}
            totalBeats={totalBeats}
            isGap={isGap}
          />
        )}

        {/* One key, swapped — never a disabled twin. There are only two states, and a
            permanently greyed-out button is noise on a card this prominent.

            The word beside it is for anyone who doesn't already read ▶/■ as transport
            controls. It's aria-hidden because the button is already named — but the name
            has to *contain* the visible word ("Play session", not "Start session"), or
            speech-input users saying "click Play" won't match the control (WCAG 2.5.3). */}
        <div className="transport-deck">
          <button
            type="button"
            className={`deck-key${isRunning ? ' deck-key--stop' : ''}`}
            onClick={isRunning ? onStop : onStart}
            aria-label={isRunning ? 'Stop session' : 'Play session'}
            title={isRunning ? 'Stop session' : 'Play session'}
          >
            <span aria-hidden="true">{isRunning ? '■' : '▶'}</span>
          </button>
          <span className="deck-label" aria-hidden="true">{isRunning ? 'Stop' : 'Play'}</span>
        </div>
      </div>
    </div>
  );
}
