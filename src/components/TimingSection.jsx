import { useState } from 'react';
import MetronomeControl from './MetronomeControl';

// Tempo/duration/pause/metronome, boxed as one collapsible group and shared between
// both practice tabs — see docs/architecture/randomizer.md's Components section for why
// the metronome lives here rather than its own block. Starts open: it's the group most
// sessions actually adjust.
export default function TimingSection({ settings, updateSettings }) {
  // "Randomize beats" / "add a pause" only decide which fields are *visible* — the
  // underlying minBeats/maxBeats/gapBeats settings are the source of truth, so these
  // start from whatever was already persisted (a range or a nonzero gap from an earlier
  // session reopens expanded) rather than tracking their own separate stored flag.
  const [rangeExpanded, setRangeExpanded] = useState(() => settings.minBeats !== settings.maxBeats);
  const [gapExpanded, setGapExpanded] = useState(() => settings.gapBeats > 0);

  return (
    <details className="settings-section" open>
      <summary>Timing</summary>
      <div className="settings-body">
        <div className="session-data-fields">
          <label className="data-field">
            <span>Tempo</span>
            <input
              type="number" min="30" max="300"
              value={settings.bpm}
              onChange={(e) => updateSettings({ bpm: Number(e.target.value) })}
            />
            <span className="data-unit">bpm</span>
          </label>
          {rangeExpanded ? (
            <>
              <label className="data-field">
                <span>Min</span>
                <input
                  type="number" min="1" max="64"
                  value={settings.minBeats}
                  onChange={(e) => updateSettings({ minBeats: Number(e.target.value) })}
                />
                <span className="data-unit">beats</span>
              </label>
              <label className="data-field">
                <span>Max</span>
                <input
                  type="number" min="1" max="64"
                  value={settings.maxBeats}
                  onChange={(e) => updateSettings({ maxBeats: Number(e.target.value) })}
                />
                <span className="data-unit">beats</span>
              </label>
            </>
          ) : (
            <label className="data-field">
              <span>Duration</span>
              <input
                type="number" min="1" max="64"
                value={settings.minBeats}
                onChange={(e) => {
                  const beats = Number(e.target.value);
                  updateSettings({ minBeats: beats, maxBeats: beats });
                }}
              />
              <span className="data-unit">beats</span>
            </label>
          )}
          <label className="checkbox-label data-toggle">
            <input
              type="checkbox"
              checked={rangeExpanded}
              onChange={(e) => {
                const checked = e.target.checked;
                setRangeExpanded(checked);
                if (checked) {
                  // Revealing Min/Max still equal to each other (true on a fresh page
                  // load, and any other time the toggle was off) looks like nothing
                  // happened — seed a real, non-degenerate range instead of leaving both
                  // fields at the same number.
                  if (settings.minBeats === settings.maxBeats) {
                    updateSettings({ minBeats: 3, maxBeats: 5 });
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
          {gapExpanded && (
            <label className="data-field">
              <span>Pause</span>
              <input
                type="number" min="0" max="16"
                value={settings.gapBeats}
                onChange={(e) => updateSettings({ gapBeats: Number(e.target.value) })}
              />
              <span className="data-unit">beats</span>
            </label>
          )}
          <label className="checkbox-label data-toggle">
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
            Add a pause between chords
          </label>
        </div>
        <MetronomeControl settings={settings} updateSettings={updateSettings} />
      </div>
    </details>
  );
}
