import { useState } from 'react';
import MetronomeControl from './MetronomeControl';
import NumberField from './NumberField';
import { NUMERIC_LIMITS } from '../hooks/useSettings';

// "1 beat", not "1 beats". These counts are small and frequently land on 1, where the
// bare plural reads as a typo.
function beatsUnit(n) {
  return n === 1 ? 'beat' : 'beats';
}

// Tempo/duration/rest/metronome, boxed as one collapsible group and shared between
// both practice tabs — see docs/architecture/randomizer.md's Components section for why
// the metronome lives here rather than its own block. Starts open: it's the group most
// sessions actually adjust.
export default function TimingSection({ settings, updateSettings }) {
  // "Randomize beats" / "Rest between tones" only decide which fields are *visible* —
  // the underlying minBeats/maxBeats/gapBeats settings are the source of truth, so these
  // start from whatever was already persisted (a range or a nonzero gap from an earlier
  // session reopens expanded) rather than tracking their own separate stored flag.
  const [rangeExpanded, setRangeExpanded] = useState(() => settings.minBeats !== settings.maxBeats);
  const [gapExpanded, setGapExpanded] = useState(() => settings.gapBeats > 0);

  return (
    <details className="settings-section" open>
      <summary>Timing</summary>
      <div className="settings-body">
        {/* Three blocks, each headed by its own caption, with the value on the line
            below it. Every control that belongs to a block sits inside that block, so a
            toggle is never adrift from what it governs (issue #40).

            Both toggles still hold position when clicked, which is the property this
            issue exists to fix — but each gets there differently. Randomize sits *below*
            its value line and what it reveals extends that line sideways, so the line
            never grows taller and the toggle beneath it doesn't move. Rest sits *above*
            its value, which appears below it. Either arrangement works as long as
            revealed content never pushes down on its own toggle. */}
        <div className="timing-block">
          <span className="timing-caption">Tempo</span>
          <div className="timing-line">
            <span className="timing-value">
              <NumberField
                {...NUMERIC_LIMITS.bpm}
                value={settings.bpm}
                onCommit={(bpm) => updateSettings({ bpm })}
                aria-label="Tempo in beats per minute"
              />
              <span className="data-unit">bpm</span>
            </span>
            <MetronomeControl settings={settings} updateSettings={updateSettings} />
          </div>
        </div>

        <div className="timing-block">
          <span className="timing-caption">Duration</span>
          <div className="timing-line">
            {/* Reads as one value either way — "4 beats", or "4 – 6 beats" once the
                range is on. The two numbers share a single unit rather than each
                carrying its own with a "min"/"max" qualifier attached, which said the
                same thing at three times the length. One span, so the whole reading
                wraps as a piece instead of stranding part of itself on a line alone. */}
            <span className="timing-value">
              <NumberField
                {...NUMERIC_LIMITS.minBeats}
                value={settings.minBeats}
                onCommit={(beats) => {
                  // With the range collapsed this field *is* the duration, so it has to
                  // carry max along with it; expanded, it's only the floor.
                  updateSettings(rangeExpanded ? { minBeats: beats } : { minBeats: beats, maxBeats: beats });
                }}
                aria-label={rangeExpanded ? 'Minimum beats' : 'Beats'}
              />
              {rangeExpanded && (
                <>
                  <span className="timing-range-dash" aria-hidden="true">–</span>
                  <NumberField
                    {...NUMERIC_LIMITS.maxBeats}
                    value={settings.maxBeats}
                    onCommit={(maxBeats) => updateSettings({ maxBeats })}
                    aria-label="Maximum beats"
                  />
                </>
              )}
              <span className="data-unit">
                {beatsUnit(rangeExpanded ? settings.maxBeats : settings.minBeats)}
              </span>
            </span>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rangeExpanded}
              onChange={(e) => {
                const checked = e.target.checked;
                setRangeExpanded(checked);
                if (checked) {
                  // Revealing a max still equal to min (true on a fresh page load, and
                  // any other time the toggle was off) looks like nothing happened —
                  // seed a real, non-degenerate range instead. No bound needed here:
                  // minBeats caps 2 below maxBeats precisely so this always lands inside
                  // the range's own ceiling (see NUMERIC_LIMITS).
                  if (settings.minBeats === settings.maxBeats) {
                    updateSettings({ maxBeats: settings.minBeats + 2 });
                  }
                } else {
                  // Collapsing back to a single field means one duration, not a stale
                  // range still being picked from behind the scenes.
                  updateSettings({ maxBeats: settings.minBeats });
                }
              }}
            />
            Randomize beats
          </label>
        </div>

        <div className="timing-block">
          <span className="timing-caption">Rest</span>
          {/* "Rest", not "pause" — it's the musical term, and "pause" is the transport
              sense that #34 will actually add. "Tones" rather than "chords" because what
              plays between rests can be a chord, a scale, or a single pitch. The
              `gapBeats` setting key keeps its name: it's persisted in localStorage, and
              renaming it would reset the value for anyone who has set one. */}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={gapExpanded}
              onChange={(e) => {
                const checked = e.target.checked;
                setGapExpanded(checked);
                if (checked) {
                  // Revealing a 0 would look like nothing happened; give it a beat.
                  if (settings.gapBeats === 0) updateSettings({ gapBeats: 1 });
                } else {
                  updateSettings({ gapBeats: 0 });
                }
              }}
            />
            Rest between tones
          </label>
          {gapExpanded && (
            <div className="timing-line">
              <span className="timing-value">
                <NumberField
                  {...NUMERIC_LIMITS.gapBeats}
                  value={settings.gapBeats}
                  onCommit={(gapBeats) => updateSettings({ gapBeats })}
                  aria-label="Rest length in beats"
                />
                <span className="data-unit">{beatsUnit(settings.gapBeats)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
