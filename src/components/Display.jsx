import NowPlaying from './NowPlaying';
import Chair from './Chair';

// `ref` lands on the sleeve itself rather than a wrapper: PipConsole observes this
// element to know when the display has left the viewport, and a wrapper would become
// the grid item in the two-column layout and change it.
export default function Display({
  ref, current, next, showCurrent, showNext, isRunning, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="sleeve" ref={ref}>
      {!isRunning && (
        <div className="sleeve-idle">
          <Chair pose="upright" size={92} className="sleeve-idle-chair" />
          <p>Press Start Session to begin.</p>
        </div>
      )}
      {isRunning && (
        <>
          <NowPlaying
            current={showCurrent ? current : null}
            next={next}
            showNext={showNext}
            beatIndex={beatIndex}
            totalBeats={totalBeats}
            isGap={isGap}
          />
          {!showCurrent && !isGap && <p className="sleeve-hint">Listening mode — tonal center hidden.</p>}
        </>
      )}
    </div>
  );
}
