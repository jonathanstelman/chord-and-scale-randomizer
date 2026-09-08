import { memo } from 'react';
import { ALL_ROOTS } from '../music/pool';
import { SCALE_TYPES } from '../music/scaleFamilies';
import { pitchClassToDisplayName } from '../music/notes';
import RootsPicker from './RootsPicker';
import TimingSection from './TimingSection';

function groupScalesByCategory() {
  const groups = new Map();
  for (const t of SCALE_TYPES) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category).push(t);
  }
  return groups;
}

const SCALE_GROUPS = groupScalesByCategory();

// Only this dropdown's labels get the familiar-name parenthetical — SCALE_TYPES.label
// stays plain "Ionian"/"Aeolian" for the Chords & Scales tab's Advanced checkboxes and
// its real-time "C Ionian" display, where the extra words would just be clutter. Pure
// Tone's audience skews toward solfège practice, where "major"/"natural minor" is the
// more recognizable name.
const SCALE_OPTION_LABEL_OVERRIDES = {
  'diatonic:Ionian': 'Ionian (Major)',
  'diatonic:Aeolian': 'Aeolian (Natural Minor)',
};

function scaleOptionLabel(type) {
  return SCALE_OPTION_LABEL_OVERRIDES[type.key] ?? type.label;
}

// Pure Tone's settings surface is deliberately smaller than the chord/scale randomizer's
// — see docs/architecture/randomizer.md's Pure Tone section for what it has and lacks,
// and why. It has no Advanced panel: Roots was the only thing in it, and Roots now sits
// inside Notes under the mode it actually applies to.
function PureToneControls({
  settings, updateSettings, toggleRoot, setAllRootsEnabled,
}) {
  const isScaleMode = settings.pureToneMode === 'scale';

  return (
    <div className="controls">
      {/* Same two-column split as Controls (#27) — one group per column here,
          since this tab's settings surface is deliberately smaller. */}
      <div className="controls-column controls-column--player">
        <TimingSection settings={settings} updateSettings={updateSettings} />
      </div>

      <div className="controls-column controls-column--pickers">
        {/* One topic (#29) — the mode buttons and Scale's own fields both describe where
            notes come from, so they share one group. This tab's counterpart to Presets in
            Controls, and starts open for the same reason. */}
        <details className="settings-section" open>
          <summary>Notes</summary>
          <div className="settings-body">
            <div className="preset-buttons">
              <button
                type="button"
                className={`preset-button${isScaleMode ? '' : ' is-active'}`}
                onClick={() => updateSettings({ pureToneMode: 'chromatic' })}
              >
                Chromatic
              </button>
              <button
                type="button"
                className={`preset-button${isScaleMode ? ' is-active' : ''}`}
                onClick={() => updateSettings({ pureToneMode: 'scale' })}
              >
                Scale
              </button>
            </div>
            {/* Each mode reveals the picker that defines its own pool: Chromatic draws
                from the enabled roots, Scale draws from a scale and ignores roots
                entirely. Roots used to sit in an Advanced panel that was reachable in
                both modes, which meant a filter set there was silently ignored half the
                time and needed a sentence of prose to explain itself. Showing it only
                where it applies says the same thing structurally. */}
            {isScaleMode ? (
              <div className="session-data-fields">
                <label className="data-field">
                  <span>Root</span>
                  <select
                    value={settings.pureToneScaleRootPc}
                    onChange={(e) => updateSettings({ pureToneScaleRootPc: Number(e.target.value) })}
                  >
                    {ALL_ROOTS.map((pc) => (
                      <option key={pc} value={pc}>{pitchClassToDisplayName(pc)}</option>
                    ))}
                  </select>
                </label>
                <label className="data-field">
                  <span>Scale</span>
                  <select
                    value={settings.pureToneScaleKey}
                    onChange={(e) => updateSettings({ pureToneScaleKey: e.target.value })}
                  >
                    {Array.from(SCALE_GROUPS.entries()).map(([category, types]) => (
                      <optgroup key={category} label={category}>
                        {types.map((t) => (
                          <option key={t.key} value={t.key}>{scaleOptionLabel(t)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <RootsPicker
                label="Pitches"
                hideLabel
                enabledRoots={settings.enabledRoots}
                toggleRoot={toggleRoot}
                setAllRootsEnabled={setAllRootsEnabled}
              />
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

export default memo(PureToneControls);
