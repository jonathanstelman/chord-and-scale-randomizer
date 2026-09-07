import { useState } from 'react';
import MetronomeControl from './MetronomeControl';

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
              <input
                type="number" min="30" max="300"
                value={settings.bpm}
                onChange={(e) => updateSettings({ bpm: Number(e.target.value) })}
              />
              <span className="data-unit">bpm</span>
            </span>
            <MetronomeControl settings={settings} updateSettings={updateSettings} />
          </div>
        </div>

        <div className="timing-block">
          <span className="timing-caption">Duration</span>
          <div className="timing-line">
            {/* Value, unit and qualifier are one span so they wrap together — loose,
                they let a narrow viewport strand "max" alone on its own line. */}
            <span className="timing-value">
              <input
                type="number" min="1" max="64"
                value={settings.minBeats}
                onChange={(e) => {
                  const beats = Number(e.target.value);
                  // With the range collapsed this field *is* the duration, so it has to
                  // carry max along with it; expanded, it's only the floor.
                  updateSettings(rangeExpanded ? { minBeats: beats } : { minBeats: beats, maxBeats: beats });
                }}
              />
              <span className="data-unit">{beatsUnit(settings.minBeats)}</span>
              {rangeExpanded && <span className="timing-qualifier">min</span>}
            </span>
            {rangeExpanded && (
              <>
                <span className="timing-separator" aria-hidden="true">|</span>
                <span className="timing-value">
                  <input
                    type="number" min="1" max="64"
                    value={settings.maxBeats}
                    onChange={(e) => updateSettings({ maxBeats: Number(e.target.value) })}
                  />
                  <span className="data-unit">{beatsUnit(settings.maxBeats)}</span>
                  <span className="timing-qualifier">max</span>
                </span>
              </>
            )}
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
                  // seed a real, non-degenerate range instead.
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
                <input
                  type="number" min="0" max="16"
                  value={settings.gapBeats}
                  onChange={(e) => updateSettings({ gapBeats: Number(e.target.value) })}
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
