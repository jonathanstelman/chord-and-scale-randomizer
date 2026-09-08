import NowPlaying from './NowPlaying';
import Chair from './Chair';
import TonalCenterVisibilityToggles from './TonalCenterVisibilityToggles';

// `ref` lands on the outer `.sleeve` — the card itself — because that's the element
// whose visibility PipConsole tracks to know when the display has left the viewport.
//
// `.sleeve-stage` inside it caps the content to a readable measure while the card is
// free to span the page (#27). It has to wrap *everything*, not just the reading: the
// two veil toggles and the transport are absolutely positioned to the corners, and
// pinned to the card they'd drift to the far edges of a full-width sleeve — a veil
// toggle half a page from the reading it governs, which is exactly the proximity
// problem #23 moved them here to fix.
export default function Display({
  ref, settings, updateSettings, current, next, isRunning, beatIndex, totalBeats, isGap,
  onStart, onStop,
}) {
  return (
    <div className="sleeve" ref={ref}>
      <div className="sleeve-stage">
        {/* Only while a session is running: idle, there's no reading to veil, and two
            glyphs floating over an empty card read as decoration. */}
        {isRunning && (
          <TonalCenterVisibilityToggles settings={settings} updateSettings={updateSettings} />
        )}

        {!isRunning && (
          <div className="sleeve-idle">
            <Chair pose="upright" size={92} className="sleeve-idle-chair" />
            <p>Press play to begin.</p>
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
