import { tonalCenterPhrase } from '../music/pool';

// A reading and the placeholder that crossfades in when it's veiled. Both are mounted at
// once on purpose: the fade has to run when *visibility* is toggled, and must not run when
// the tonal center changes — swapping the text of a single element would either animate
// every segment or animate nothing. The placeholder is absolutely positioned over the
// reading, so veiling doesn't collapse the row's height.
function Reading({ className, veiled, children }) {
  return (
    <span className={`reading-veil${veiled ? ' is-veiled' : ''}`}>
      <span className={`${className} veilable${veiled ? ' is-veiled' : ''}`}>{children}</span>
      <span className={`${className} veil-placeholder`} aria-hidden="true">—</span>
    </span>
  );
}

export default function NowPlaying({
  current, next, showCurrent, showNext, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="now-playing">
      <div className="reading-row">
        <div className="reading reading--current">
          <Reading
            className={`chord-name${isGap ? ' chord-name--gap' : ''}`}
            veiled={!showCurrent}
          >
            {isGap ? 'Get ready…' : current ? tonalCenterPhrase(current) : '—'}
          </Reading>
        </div>

        {next && (
          <div className="reading reading--next">
            <span className="reading-eyebrow">Next</span>
            <Reading className="chord-name chord-name--next" veiled={!showNext}>
              {tonalCenterPhrase(next)}
            </Reading>
          </div>
        )}
      </div>

      {(current || isGap) && (
        <div className="beat-panel">
          <div className="beat-numeral">
            <span className="beat-numeral-current">{beatIndex}</span>
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
