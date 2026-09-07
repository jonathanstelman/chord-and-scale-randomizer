import NowPlaying from './NowPlaying';
import Chair from './Chair';

export default function Display({
  current, next, showCurrent, showNext, isRunning, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="sleeve">
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
