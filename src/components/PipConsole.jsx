import { useEffect, useState } from 'react';
import { tonalCenterPhrase } from '../music/pool';

/**
 * A minimal floating console that docks once the main display has scrolled out of
 * view, and un-docks when it scrolls back — true picture-in-picture, not an always-on
 * widget.
 *
 * Running, it shows the current tonal center, the queue behind it, and a metronome cue.
 * Idle, it shows the wordmark and a play key — see docs/architecture/randomizer.md's
 * "PiP console" for why the idle state is deliberately this thin, and for where this
 * docks at all (in practice, phones).
 *
 * Still no tempo or volume: those are one scroll away, and the console is for staying on
 * the beat rather than being a second control surface.
 *
 * `displayRef` points at the in-flow display element this shadows.
 */
export default function PipConsole({
  displayRef, current, queue, showCurrent, showNext, labelStyle, isRunning, isPaused, beatIndex,
  totalBeats, isGap, onStart, onPause, onResume, onStop,
}) {
  const [displayVisible, setDisplayVisible] = useState(true);

  useEffect(() => {
    const target = displayRef.current;
    if (!target) return undefined;

    // rootMargin trims the top edge: without it the console flickers on and off while
    // the display sits exactly at the boundary, since every pixel of scroll flips
    // intersection. threshold 0 means "any part visible keeps it hidden".
    const observer = new IntersectionObserver(
      ([entry]) => setDisplayVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: '-8px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [displayRef]);

  if (displayVisible) return null;

  // The display's deck in miniature, and it has to mirror it rather than simplify: a
  // lone ▶ here would call start() on a *paused* session, silently restarting an ordered
  // bank. See docs/architecture/randomizer.md's "PiP console" and "Pause vs. stop".
  const key = (glyph, word, onClick, variant) => (
    <button
      type="button"
      className={`pip-key${variant ? ` pip-key--${variant}` : ''}`}
      onClick={onClick}
      aria-label={`${word} session`}
      title={`${word} session`}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );

  const playing = isRunning && !isPaused;
  const transport = (
    <span className="pip-transport">
      {key(
        playing ? '‖' : '▶',
        playing ? 'Pause' : 'Play',
        isRunning ? (isPaused ? onResume : onPause) : onStart,
      )}
      {isRunning && key('■', 'Stop', onStop, 'stop')}
    </span>
  );

  if (!isRunning) {
    return (
      <div className="pip-console pip-console--idle">
        <span className="pip-wordmark">Musical Chairs</span>
        {transport}
      </div>
    );
  }

  // Mirrors Display: listening mode hides the readout everywhere, so the console must
  // not become a way to peek at the answer the main display is deliberately withholding.
  // Same for showNext, which gates the queue in NowPlaying.
  const readout = isGap
    ? 'Get ready…'
    : showCurrent && current
      ? tonalCenterPhrase(current, labelStyle)
      : '—';

  return (
    <div className="pip-console">
      <div className="pip-top">
        <span className="pip-beats" aria-hidden="true">
          {Array.from({ length: totalBeats }, (_, i) => {
            const n = i + 1;
            const isCurrent = n === beatIndex;
            return (
              <span
                key={n}
                className={`pip-beat${isCurrent ? ' pip-beat--current' : ''}${isGap ? ' pip-beat--gap' : ''}`}
              />
            );
          })}
        </span>

        {transport}
      </div>

      <span className={`pip-readout${isGap ? ' pip-readout--gap' : ''}`}>{readout}</span>

      {showNext && queue.length > 0 && (
        <span className="pip-next">
          <span className="pip-next-eyebrow">Next</span>
          <span className="pip-next-queue">
            {queue.map((item, i) => (
              <span
                key={`${item.rootName}-${item.typeLabel}-${i}`}
                className={`pip-next-name chord-name--q${i + 1}`}
              >
                {tonalCenterPhrase(item, labelStyle)}
              </span>
            ))}
          </span>
        </span>
      )}
    </div>
  );
}
