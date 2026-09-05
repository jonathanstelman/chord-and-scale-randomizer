// A small spinning-disc badge for flavor, color-coded by difficulty tier — but the actual
// answer is plain text read as one phrase ("A Phrygian"), not split across the badge and
// a separate caption. Splitting root and quality apart (a giant number in a circle, then
// a differently-sized label underneath) was cute but cognitively harder to read fast,
// which defeats the point of a chord/scale-recognition tool.
function RecordBadge({ modeKey, spinning }) {
  return <div className={`record-badge record-badge--${modeKey}${spinning ? ' is-spinning' : ''}`} />;
}

export default function Turntable({
  current, next, showNext, beatIndex, totalBeats, isGap, isRunning,
}) {
  return (
    <div className="turntable">
      <div className="reading-row">
        <div className="reading reading--current">
          <RecordBadge modeKey={current?.modeKey ?? 'none'} spinning={isRunning && !!current} />
          <span className={`chord-name${isGap ? ' chord-name--gap' : ''}`}>
            {isGap ? 'Get ready…' : current ? `${current.rootName} ${current.typeLabel}` : '—'}
          </span>
        </div>

        {showNext && next && (
          <div className="reading reading--next">
            <span className="reading-eyebrow">Next</span>
            <div className="reading-next-line">
              <RecordBadge modeKey={next.modeKey} spinning={false} />
              <span className="chord-name chord-name--next">{next.rootName} {next.typeLabel}</span>
            </div>
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
