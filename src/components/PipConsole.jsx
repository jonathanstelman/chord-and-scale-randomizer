import { useEffect, useState } from 'react';
import { tonalCenterPhrase } from '../music/pool';

/**
 * A minimal floating console that docks once the main display has scrolled out of
 * view, and un-docks when it scrolls back — true picture-in-picture, not an always-on
 * widget.
 *
 * Deliberately shows only the current tonal center and a metronome cue: no "next", no
 * transport, no tempo or volume. Everything omitted is still one scroll away, and the
 * console exists to keep you on the beat, not to be a second control surface.
 *
 * `displayRef` points at the in-flow display element this shadows.
 */
export default function PipConsole({
  displayRef, current, showCurrent, isRunning, beatIndex, totalBeats, isGap, onStop,
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

  // Mirrors Display: listening mode hides the reading everywhere, so the console must
  // not become a way to peek at the answer the main display is deliberately withholding.
  const reading = isGap
    ? 'Get ready…'
    : showCurrent && current
      ? tonalCenterPhrase(current)
      : '—';

  return (
    <div className="pip-console">
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

      <span className={`pip-reading${isGap ? ' pip-reading--gap' : ''}`}>{reading}</span>

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
  );
}
