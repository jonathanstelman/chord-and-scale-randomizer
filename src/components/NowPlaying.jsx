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

export default function NowPlaying({
  current, next, showCurrent, showNext, beatIndex, totalBeats, isGap,
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

        {next && (
          <div className="readout readout--next">
            <span className="readout-eyebrow">Next</span>
            <Readout className="chord-name chord-name--next" veiled={!showNext}>
              {tonalCenterPhrase(next)}
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
