import { memo, useEffect, useRef, useState } from 'react';
import {
  ALL_ROOTS, ALL_TONAL_CENTER_TYPES, CORE_MODES, PRESETS, modeCheckState, rootsCheckState,
} from '../music/pool';
import { pitchClassToDisplayName } from '../music/notes';
import { parseCustomBank } from '../music/chordParser';

function typeLabelForKey(key) {
  return ALL_TONAL_CENTER_TYPES.find((t) => t.key === key)?.label ?? key;
}

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
  settings, updateSettings, toggleType, setModeEnabled, toggleRoot, setAllRootsEnabled, applyPreset,
  setCustomBankText, commitCustomBank, setCustomBankMode, setCustomBankEnabled,
  isRunning, onStart, onStop,
}) {
  // "Randomize beats" / "add a pause" only decide which fields are *visible* — the
  // underlying minBeats/maxBeats/gapBeats settings are the source of truth, so these
  // start from whatever was already persisted (a range or a nonzero gap from an earlier
  // session reopens expanded) rather than tracking their own separate stored flag.
  const [rangeExpanded, setRangeExpanded] = useState(() => settings.minBeats !== settings.maxBeats);
  const [gapExpanded, setGapExpanded] = useState(() => settings.gapBeats > 0);
  // Transient — cleared on every successful parse, never persisted. A parse failure
  // keeps whatever customBankEntries was last committed (see commitCustomBank), so a
  // typo mid-edit doesn't blow away a bank that's actively playing.
  const [bankError, setBankError] = useState(null);

  const parseBankOnBlur = () => {
    const { entries, errors } = parseCustomBank(settings.customBankText);
    if (errors.length > 0) {
      setBankError(errors.map((raw) => `"${raw}"`).join(', '));
      return;
    }
    setBankError(null);
    commitCustomBank(entries);
  };

  return (
    <div className="controls">
      <button className="transport-button" onClick={isRunning ? onStop : onStart}>
        {isRunning ? '■ Stop Session' : '▶ Start Session'}
      </button>

      <div className="session-data">
        <div className="session-data-group">
          <span className="session-data-group-label">Timing</span>
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
                  // Collapsing back to a single field means one duration, not a stale
                  // range still being picked from behind the scenes.
                  if (!checked) updateSettings({ maxBeats: settings.minBeats });
                }}
              />
              Randomize beats
            </label>
            {gapExpanded && (
              <label className="data-field">
                <span>Gap</span>
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
        </div>
        <div className="session-data-group">
          <span className="session-data-group-label">Sound</span>
          <div className="session-data-fields">
            <label className="data-field">
              <span>Sound</span>
              <select
                value={settings.soundType}
                onChange={(e) => updateSettings({ soundType: e.target.value })}
              >
                <option value="chord">Chord</option>
                <option value="arpeggio">Arpeggio</option>
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
        </div>
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

      <div className="preset-row">
        <span className="session-data-group-label">Presets</span>
        <div className="preset-buttons">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`preset-button${preset.pairs && settings.enabledPairs === preset.pairs ? ' is-active' : ''}`}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      {settings.enabledPairs && (
        <p className="preset-note">
          Guitar mode is active, drawing only from the 8 standard open chords. Any change
          to the mode/type/root checkboxes below returns to normal filtering.
        </p>
      )}

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

      <div className="custom-bank">
        <div className="custom-bank-head">
          <span className="session-data-group-label">Custom bank</span>
          <div className="custom-bank-mode">
            <label className="checkbox-label">
              <input
                type="radio"
                name="customBankMode"
                checked={settings.customBankMode === 'random'}
                onChange={() => setCustomBankMode('random')}
              />
              Random
            </label>
            <label className="checkbox-label">
              <input
                type="radio"
                name="customBankMode"
                checked={settings.customBankMode === 'ordered'}
                onChange={() => setCustomBankMode('ordered')}
              />
              In order
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.customBankEnabled}
              disabled={settings.customBankEntries.length === 0}
              onChange={(e) => setCustomBankEnabled(e.target.checked)}
            />
            Use custom bank
          </label>
        </div>
        <textarea
          className="custom-bank-input"
          rows={2}
          placeholder="C, Am, F, G7"
          value={settings.customBankText}
          onChange={(e) => setCustomBankText(e.target.value)}
          onBlur={parseBankOnBlur}
        />
        {bankError ? (
          <p className="custom-bank-error">⚠ Couldn&rsquo;t parse: {bankError}</p>
        ) : settings.customBankEntries.length > 0 && (
          <p className="custom-bank-parsed">
            Parsed {settings.customBankEntries.length}
            {' '}
            chord
            {settings.customBankEntries.length === 1 ? '' : 's'}
            :
            {' '}
            {settings.customBankEntries
              .map((e) => `${pitchClassToDisplayName(e.rootPc)} ${typeLabelForKey(e.typeKey)}`)
              .join(', ')}
          </p>
        )}
      </div>
      {settings.customBankEnabled && (
        <p className="preset-note">
          Custom bank is active ({settings.customBankMode === 'ordered' ? 'in order' : 'random'}),
          drawing only from the chords above. Any change to the mode/type/root checkboxes
          below returns to normal filtering.
        </p>
      )}

      <details className="advanced">
        <summary>▸ Advanced settings</summary>
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
        <fieldset className="roots-fieldset">
          <div className="fieldset-head">
            <legend>Roots</legend>
            <TriStateCheckbox
              className="category-select-all"
              label="select all"
              state={rootsCheckState(settings.enabledRoots)}
              onChange={setAllRootsEnabled}
            />
          </div>
          <div className="roots-grid">
            {ALL_ROOTS.map((pc) => (
              <label key={pc} className="checkbox-label track-row">
                <input
                  type="checkbox"
                  checked={settings.enabledRoots.includes(pc)}
                  onChange={() => toggleRoot(pc)}
                />
                {pitchClassToDisplayName(pc)}
              </label>
            ))}
          </div>
        </fieldset>
      </details>
    </div>
  );
}

export default memo(Controls);
