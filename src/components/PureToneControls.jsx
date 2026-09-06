import { memo } from 'react';
import { ALL_ROOTS } from '../music/pool';
import { SCALE_TYPES } from '../music/scaleFamilies';
import { pitchClassToDisplayName } from '../music/notes';
import RootsPicker from './RootsPicker';
import TimingFields from './TimingFields';
import MetronomeControl from './MetronomeControl';
import ShowToggles from './ShowToggles';

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
// — see issue #7 / docs/architecture/randomizer.md's Pure Tone section: tempo/duration/
// gap still apply (shared settings, same TimingFields as Controls), but there's no
// sound-type select (always a single tone), no density field (always one note), and no
// mode/type checkboxes or custom bank (there's no chord/scale "type" to pick from, just
// a root).
//
// The one settings surface Pure Tone does have of its own: which notes are in play.
// 'Chromatic' draws from the shared Roots filter below (any of the 12), same as every
// other tab; 'Scale' draws from every tone of a chosen scale instead — ideal for
// solfège-style practice within one key — and ignores the Roots filter entirely while
// active (see pickNextForPureTone in useRandomizer.js).
function PureToneControls({
  settings, updateSettings, toggleRoot, setAllRootsEnabled, isRunning, onStart, onStop,
}) {
  const isScaleMode = settings.pureToneMode === 'scale';

  return (
    <div className="controls">
      <button className="transport-button" onClick={isRunning ? onStop : onStart}>
        {isRunning ? '■ Stop Session' : '▶ Start Session'}
      </button>

      <div className="session-data">
        <TimingFields settings={settings} updateSettings={updateSettings} />
      </div>

      <div className="preset-row">
        <span className="session-data-group-label">Notes</span>
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
      </div>
      <p className="preset-description">
        {isScaleMode
          ? 'Randomly selected notes from the chosen scale below, ideal for solfège practice.'
          : 'Randomly selected notes from any of the 12 pitch classes.'}
      </p>
      {isScaleMode && (
        <>
          <p className="preset-note">
            Scale is active, drawing only from its notes. The Roots filter in Advanced
            settings doesn&rsquo;t apply while Scale is selected.
          </p>
          <div className="session-data">
            <div className="session-data-group">
              <span className="session-data-group-label">Scale</span>
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
            </div>
          </div>
        </>
      )}

      <ShowToggles settings={settings} updateSettings={updateSettings} />
      <MetronomeControl settings={settings} updateSettings={updateSettings} />

      <details className="advanced">
        <summary>▸ Advanced settings</summary>
        <RootsPicker
          enabledRoots={settings.enabledRoots}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
        />
      </details>
    </div>
  );
}

export default memo(PureToneControls);
