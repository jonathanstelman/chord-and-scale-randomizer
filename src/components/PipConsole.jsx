import { useEffect, useState } from 'react';
import { tonalCenterPhrase } from '../music/pool';

/**
 * A minimal floating console that docks once the main display has scrolled out of
 * view, and un-docks when it scrolls back — true picture-in-picture, not an always-on
 * widget.
 *
 * Shows the current tonal center, the next one, and a metronome cue. Still no
 * transport, tempo or volume: those are one scroll away, and the console is for
 * staying on the beat rather than being a second control surface.
 *
 * `displayRef` points at the in-flow display element this shadows.
 */
export default function PipConsole({
  displayRef, current, next, showCurrent, showNext, isRunning, beatIndex, totalBeats, isGap, onStop,
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

  // Only meaningful mid-session. Leaving it mounted while stopped would also mean a
  // stale tonal center hanging in the corner.
  if (!isRunning || displayVisible) return null;

  // Mirrors Display: listening mode hides the readout everywhere, so the console must
  // not become a way to peek at the answer the main display is deliberately withholding.
  // Same for showNext, which gates the next readout in NowPlaying.
  const readout = isGap
    ? 'Get ready…'
    : showCurrent && current
      ? tonalCenterPhrase(current)
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

        <button
          type="button"
          className="pip-close"
          onClick={onStop}
          aria-label="Stop session"
          title="Stop session"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <span className={`pip-readout${isGap ? ' pip-readout--gap' : ''}`}>{readout}</span>

      {showNext && next && (
        <span className="pip-next">
          <span className="pip-next-eyebrow">Next</span>
          <span className="pip-next-name">{tonalCenterPhrase(next)}</span>
        </span>
      )}
    </div>
  );
}
