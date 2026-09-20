import { tonalCenterPhrase } from '../music/pool';

// A readout and the placeholder that crossfades in when it's veiled. Both are mounted at
// once on purpose: the fade has to run when *visibility* is toggled, and must not run when
// the tonal center changes — swapping the text of a single element would either animate
// every segment or animate nothing. The placeholder is absolutely positioned over the
// readout, so veiling doesn't collapse the row's height.
function Readout({ className, veiled, children }) {
  return (
    <span className={`readout-veil${veiled ? ' is-veiled' : ''}`}>
      <span className={`${className} veilable${veiled ? ' is-veiled' : ''}`}>{children}</span>
      <span className={`${className} veil-placeholder`} aria-hidden="true">—</span>
    </span>
  );
}

// Depth is carried by saturation, not size — see docs/architecture/randomizer.md's
// "Queue depth".
const QUEUE_TIERS = ['q1', 'q2', 'q3', 'q4'];

export default function NowPlaying({
  current, queue, showCurrent, showNext, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="now-playing">
      <div className="readout-row">
        <div className="readout readout--current">
          <Readout
            className={`chord-name${isGap ? ' chord-name--gap' : ''}`}
            veiled={!showCurrent}
          >
            {isGap ? 'Get ready…' : current ? tonalCenterPhrase(current) : '—'}
          </Readout>
        </div>

        {/* One veil over the whole queue, not one per entry: showNext is a single
            listening-mode switch, and four placeholders stacked up would read as four
            hidden things rather than one hidden queue. */}
        {queue.length > 0 && (
          <div className="readout readout--next">
            <span className="readout-eyebrow">Next</span>
            <Readout className="chord-queue" veiled={!showNext}>
              {queue.map((item, i) => (
                <span
                  key={`${item.rootName}-${item.typeLabel}-${i}`}
                  className={`chord-name chord-name--next chord-name--${QUEUE_TIERS[i]}`}
                >
                  {tonalCenterPhrase(item)}
                </span>
              ))}
            </Readout>
          </div>
        )}
      </div>

      {(current || isGap) && (
        <div className="beat-panel">
          <div className="beat-numeral">
            <span className={`beat-numeral-current${isGap ? ' beat-numeral-current--gap' : ''}`}>{beatIndex}</span>
            <span className="beat-numeral-total">/ {totalBeats}</span>
          </div>
          <div className="beat-track">
            {Array.from({ length: totalBeats }, (_, i) => {
              const n = i + 1;
              const state = n < beatIndex ? 'past' : n === beatIndex ? 'current' : 'upcoming';
              return <span key={n} className={`beat-block beat-block--${state}${isGap ? ' beat-block--gap' : ''}`} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
