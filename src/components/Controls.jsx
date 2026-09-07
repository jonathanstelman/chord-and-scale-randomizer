import { memo, useState } from 'react';
import {
  ALL_TONAL_CENTER_TYPES, CORE_MODES, PRESETS, modeCheckState,
} from '../music/pool';
import { pitchClassToDisplayName } from '../music/notes';
import { parseCustomBank } from '../music/chordParser';
import TriStateCheckbox from './TriStateCheckbox';
import RootsPicker from './RootsPicker';
import TimingSection from './TimingSection';

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

// Memoized: this renders a lot of checkboxes (more once the Advanced panel is open), and
// none of it depends on the beat clock — without this it would re-render on every single
// beat tick (via App -> beatIndex), competing with Tone.js's live audio scheduling for
// main-thread time for no reason.
function Controls({
  settings, updateSettings, toggleType, setModeEnabled, toggleRoot, setAllRootsEnabled, applyPreset,
  setCustomBankText, commitCustomBank, setCustomBankMode, setCustomBankEnabled,
}) {
  // Transient — cleared on every successful parse, never persisted. A parse failure
  // keeps whatever customBankEntries was last committed (see commitCustomBank), so a
  // typo mid-edit doesn't blow away a bank that's actively playing.
  const [bankError, setBankError] = useState(null);

  const activePreset = PRESETS.find((p) => p.key === settings.activePresetKey);

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
      <TimingSection settings={settings} updateSettings={updateSettings} />

      <div className="settings-section">
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
              {/* Reserves the same third line Density's "notes" unit takes, so the two
                  fields' captions/controls line up instead of Density's extra line
                  pulling it up relative to Sound under the shared flex-end alignment. */}
              <span className="data-unit" aria-hidden="true">&nbsp;</span>
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

      <div className="preset-row">
        <span className="session-data-group-label">Presets</span>
        <div className="preset-buttons">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`preset-button${preset.key === settings.activePresetKey ? ' is-active' : ''}`}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      {activePreset && (
        <>
          <p className="preset-description">{activePreset.description}</p>
          <p className="preset-note">
            Any change to the mode/type/root checkboxes below customizes from here.
          </p>
        </>
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
        <RootsPicker
          enabledRoots={settings.enabledRoots}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
        />
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
