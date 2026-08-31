import { memo, useEffect, useRef } from 'react';
import { ALL_TONAL_CENTER_TYPES, CORE_MODES, modeCheckState } from '../music/pool';

function groupByCategory(types) {
  const groups = {};
  for (const t of types) {
    (groups[t.category] ??= []).push(t);
  }
  return groups;
}

const CATEGORY_GROUPS = groupByCategory(ALL_TONAL_CENTER_TYPES);

// A checkbox that can render as "indeterminate" (dash) when only some of the types it
// covers are enabled — used both for the top-level mode row and each advanced section's
// own "select all" control.
function TriStateCheckbox({ label, state, onChange, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <label className={`checkbox-label${className ? ` ${className}` : ''}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={state === 'all'}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// Memoized: this renders a lot of checkboxes (more once the Advanced panel is open), and
// none of it depends on the beat clock — without this it would re-render on every single
// beat tick (via App -> beatIndex), competing with Tone.js's live audio scheduling for
// main-thread time for no reason.
function Controls({
  settings, updateSettings, toggleType, setModeEnabled, isRunning, onStart, onStop,
}) {
  return (
    <div className="controls">
      <button className="transport-button" onClick={isRunning ? onStop : onStart}>
        {isRunning ? '■ Stop Session' : '▶ Start Session'}
      </button>

      <div className="session-data">
        <label className="data-field">
          <span>Tempo</span>
          <input
            type="number" min="30" max="300"
            value={settings.bpm}
            onChange={(e) => updateSettings({ bpm: Number(e.target.value) })}
          />
          <span className="data-unit">bpm</span>
        </label>
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
        <label className="data-field">
          <span>Gap</span>
          <input
            type="number" min="0" max="16"
            value={settings.gapBeats}
            onChange={(e) => updateSettings({ gapBeats: Number(e.target.value) })}
          />
          <span className="data-unit">beats</span>
        </label>
        <label className="data-field">
          <span>Sound</span>
          <select
            value={settings.soundType}
            onChange={(e) => updateSettings({ soundType: e.target.value })}
          >
            <option value="chord">Chord</option>
            <option value="arpeggio">Arpeggio</option>
            <option value="pad">Pad</option>
            <option value="none">No Sound</option>
          </select>
        </label>
        <label className="data-field">
          <span>Density</span>
          <input
            type="number" min="1" max="7"
            value={settings.maxChordNotes}
            onChange={(e) => updateSettings({ maxChordNotes: Number(e.target.value) })}
          />
          <span className="data-unit">notes</span>
        </label>
      </div>

      <div className="toggle-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.showCurrent}
            onChange={(e) => updateSettings({ showCurrent: e.target.checked })}
          />
          Show current
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.showNext}
            onChange={(e) => updateSettings({ showNext: e.target.checked })}
          />
          Show next
        </label>
      </div>

      <div className="metronome-control">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.metronomeAudio}
            onChange={(e) => updateSettings({ metronomeAudio: e.target.checked })}
          />
          Metronome
        </label>
        <label className="metronome-volume">
          <span>Volume</span>
          <input
            type="range" min="0" max="100"
            value={settings.metronomeVolume}
            onChange={(e) => updateSettings({ metronomeVolume: Number(e.target.value) })}
            disabled={!settings.metronomeAudio}
          />
        </label>
      </div>

      <div className="mode-row">
        {CORE_MODES.map((mode) => {
          const state = modeCheckState(mode, settings.enabledTypes);
          return (
            <TriStateCheckbox
              key={mode.key}
              label={mode.label}
              state={state}
              onChange={(enabled) => setModeEnabled(mode, enabled)}
              className={`mode-block mode-block--${mode.key}${state === 'all' ? ' is-on' : ''}${state === 'some' ? ' is-partial' : ''}`}
            />
          );
        })}
      </div>

      <details className="advanced">
        <summary>▸ Advanced — session personnel</summary>
        <div className="type-groups">
          {Object.entries(CATEGORY_GROUPS).map(([category, types]) => {
            const categoryMode = { categories: [category] };
            return (
              <fieldset key={category}>
                <div className="fieldset-head">
                  <legend>{category}</legend>
                  <TriStateCheckbox
                    className="category-select-all"
                    label="select all"
                    state={modeCheckState(categoryMode, settings.enabledTypes)}
                    onChange={(enabled) => setModeEnabled(categoryMode, enabled)}
                  />
                </div>
                {types.map((t) => (
                  <label key={t.key} className="checkbox-label track-row">
                    <input
                      type="checkbox"
                      checked={settings.enabledTypes.includes(t.key)}
                      onChange={() => toggleType(t.key)}
                    />
                    {t.degreeIndex && <span className="track-number">{String(t.degreeIndex).padStart(2, '0')}</span>}
                    {t.label}
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
      </details>
    </div>
  );
}

export default memo(Controls);
