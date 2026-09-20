import NowPlaying from './NowPlaying';
import Chair from './Chair';
import TonalCenterVisibilityToggles from './TonalCenterVisibilityToggles';

// One key plus the word beside it. `variant` is the only styling difference — Stop is
// flame, everything else inherits the neutral key.
//
// The name is built from the visible word on purpose: it's aria-hidden because the
// button is already named, but that name has to *contain* the word ("Play session", not
// "Start session") or speech-input users saying "click Play" won't match it (WCAG 2.5.3).
function DeckKey({ glyph, word, onClick, variant }) {
  return (
    <span className="deck-control">
      <button
        type="button"
        className={`deck-key${variant ? ` deck-key--${variant}` : ''}`}
        onClick={onClick}
        aria-label={`${word} session`}
        title={`${word} session`}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
      <span className="deck-label" aria-hidden="true">{word}</span>
    </span>
  );
}

// The example queue the idle card shows. It runs as deep as the user's own queueDepth
// (sliced below) so the example can't claim a session looks different than it will.
const IDLE_QUEUE = ['A Minor', 'F Major', 'G Dom 7', 'D Minor'];

// The ref goes on the outer `.sleeve`: the card is what leaves the viewport, and that's
// what PipConsole observes. `.sleeve-stage` caps the content measure and has to wrap
// everything, corner controls included — see docs/architecture/randomizer.md's "Settings
// in two columns".
export default function Display({
  ref, settings, updateSettings, current, queue, isRunning, isPaused, beatIndex, totalBeats, isGap,
  onStart, onPause, onResume, onStop,
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
                {settings.queueDepth > 0 && (
                  <div className="readout readout--next">
                    <span className="readout-eyebrow">Next</span>
                    <span className="chord-queue">
                      {IDLE_QUEUE.slice(0, settings.queueDepth).map((name, i) => (
                        <span key={name} className={`chord-name chord-name--next chord-name--q${i + 1}`}>
                          {name}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
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
            queue={queue}
            showCurrent={settings.showCurrent}
            showNext={settings.showNext}
            beatIndex={beatIndex}
            totalBeats={totalBeats}
            isGap={isGap}
          />
        )}

        {/* A cassette deck — why both keys are always here, and why stop and pause mean
            different things: docs/architecture/randomizer.md's "Pause vs. stop". */}
        <div className="transport-deck">
          <DeckKey
            glyph={isRunning && !isPaused ? '‖' : '▶'}
            word={isRunning && !isPaused ? 'Pause' : 'Play'}
            onClick={isRunning ? (isPaused ? onResume : onPause) : onStart}
          />
          {isRunning && (
            <DeckKey glyph="■" word="Stop" onClick={onStop} variant="stop" />
          )}
        </div>
      </div>
    </div>
  );
}
