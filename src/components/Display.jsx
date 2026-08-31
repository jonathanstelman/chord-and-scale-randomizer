import Turntable from './Turntable';

export default function Display({
  current, next, showCurrent, showNext, isRunning, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="sleeve">
      {!isRunning && (
        <div className="sleeve-idle">
          <span className="sleeve-idle-mark">▷</span>
          <p>Press Start Session to begin.</p>
        </div>
      )}
      {isRunning && (
        <>
          <Turntable
            current={showCurrent ? current : null}
            next={next}
            showNext={showNext}
            beatIndex={beatIndex}
            totalBeats={totalBeats}
            isGap={isGap}
            isRunning={isRunning}
          />
          {!showCurrent && !isGap && <p className="sleeve-hint">Listening mode — tonal center hidden.</p>}
        </>
      )}
    </div>
  );
}
