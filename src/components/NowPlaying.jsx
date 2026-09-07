import { tonalCenterPhrase } from '../music/pool';

export default function NowPlaying({
  current, next, showNext, beatIndex, totalBeats, isGap,
}) {
  return (
    <div className="now-playing">
      <div className="reading-row">
        <div className="reading reading--current">
          <span className={`chord-name${isGap ? ' chord-name--gap' : ''}`}>
            {isGap ? 'Get ready…' : current ? tonalCenterPhrase(current) : '—'}
          </span>
        </div>

        {showNext && next && (
          <div className="reading reading--next">
            <span className="reading-eyebrow">Next</span>
            <span className="chord-name chord-name--next">{tonalCenterPhrase(next)}</span>
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
