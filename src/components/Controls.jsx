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

  // The text as of the last successful apply. This can't be re-derived from
  // customBankEntries: those render back out as full labels ("C Major, G Dominant 7")
  // while the field holds whatever shorthand was typed ("C, G7"), so comparing the two
  // reports "unapplied" forever. Seeded from the persisted text, which is applied by
  // definition — customBankEntries was persisted alongside it.
  const [appliedBankText, setAppliedBankText] = useState(settings.customBankText);
  const hasUncommittedBankText = settings.customBankText !== appliedBankText;

  // Enter applies; Shift+Enter still inserts a newline, which matters because
  // parseCustomBank splits on /[,\n]+/ — a newline is a real separator here, so
  // one-chord-per-line is a legitimate way to write a bank, not an accident.
  const handleBankKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      applyBank();
    }
  };

  const applyBank = () => {
    const { entries, errors } = parseCustomBank(settings.customBankText);
    if (errors.length > 0) {
      setBankError(errors.map((raw) => `"${raw}"`).join(', '));
      return;
    }
    setBankError(null);
    setAppliedBankText(settings.customBankText);
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

      {/* Collapsed by default (#26): the one section most sessions never touch, unlike
          everything else in this flow. The summary carries the name, so the block below
          drops its own heading. Note the "custom bank is active" note stays *outside*
          the details — an enabled bank silently overriding the pickers is exactly what
          you'd miss with this closed. */}
      <details className="advanced custom-bank-details">
        <summary>Custom bank</summary>
        <div className="custom-bank">
          <div className="custom-bank-head">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.customBankEnabled}
                disabled={settings.customBankEntries.length === 0}
                onChange={(e) => setCustomBankEnabled(e.target.checked)}
              />
              Use custom bank
            </label>
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
          </div>
          <textarea
            className="custom-bank-input"
            rows={2}
            placeholder="C, Am, F, G7"
            value={settings.customBankText}
            onChange={(e) => setCustomBankText(e.target.value)}
            onBlur={applyBank}
            onKeyDown={handleBankKeyDown}
          />
          {/* Blur still commits, but it used to be the *only* way to — undiscoverable,
              since a textarea's Enter inserts a newline rather than submitting, leaving
              Tab or clicking away. Now Enter applies and the button says so out loud;
              the button disables once the text matches what was last applied, so it
              doubles as the indicator that there are unapplied edits. */}
          <div className="custom-bank-actions">
            <button
              type="button"
              className="custom-bank-apply"
              onClick={applyBank}
              disabled={!hasUncommittedBankText}
            >
              Apply
            </button>
            <span className="custom-bank-hint">or press Enter</span>
            {hasUncommittedBankText && (
              <span className="custom-bank-dirty">Not applied yet</span>
            )}
          </div>
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
      </details>
      {settings.customBankEnabled && (
        <p className="preset-note">
          {/* "the chords above" stopped being true once the bank collapsed (#26) — they
              may well be behind a closed disclosure now. */}
          Custom bank is active ({settings.customBankMode === 'ordered' ? 'in order' : 'random'}),
          drawing only from your custom bank. Any change to the mode/type/root checkboxes
          below returns to normal filtering.
        </p>
      )}

      <details className="advanced">
        <summary>Advanced settings</summary>
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
