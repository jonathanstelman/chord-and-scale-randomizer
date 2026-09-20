import { memo } from 'react';
import { ALL_ROOTS } from '../music/pool';
import { pitchClassToDisplayName } from '../music/notes';
import { NUMERIC_LIMITS } from '../hooks/useSettings';
import TimingSection from './TimingSection';
import DisplaySection from './DisplaySection';
import { SCALE_GROUPS, scaleOptionLabel } from './scaleOptions';

// Pure Tone's sibling: same two-column split, with this tab's key and drone settings in
// the picker column. What it has and why is in docs/architecture/randomizer.md's Scale
// Degrees section.
function ScaleDegreesControls({ settings, updateSettings }) {
  const isChromatic = settings.scaleDegreesPool === 'chromatic';

  return (
    <div className="controls">
      <div className="controls-column controls-column--player">
        <TimingSection settings={settings} updateSettings={updateSettings} />
        <DisplaySection settings={settings} updateSettings={updateSettings} />
      </div>

      <div className="controls-column controls-column--pickers">
        {/* The pool toggle, the key and the label style all describe how a target note is
            drawn and named, so they share one group — Pure Tone's Notes, with a key. */}
        <details className="settings-section" open>
          <summary>Notes</summary>
          <div className="settings-body">
            <div className="preset-buttons">
              <button
                type="button"
                className={`preset-button${isChromatic ? '' : ' is-active'}`}
                onClick={() => updateSettings({ scaleDegreesPool: 'diatonic' })}
              >
                Diatonic
              </button>
              <button
                type="button"
                className={`preset-button${isChromatic ? ' is-active' : ''}`}
                onClick={() => updateSettings({ scaleDegreesPool: 'chromatic' })}
              >
                Chromatic
              </button>
            </div>
            {/* Root and Scale stay visible in both pool modes, unlike Pure Tone's: the
                drone sounds the key and every degree is labeled against it, so Chromatic
                needs a key as much as Diatonic does — see the Scale Degrees section of
                docs/architecture/randomizer.md. */}
            <div className="session-data-fields">
              <label className="data-field">
                <span>Root</span>
                <select
                  value={settings.scaleDegreesRootPc}
                  onChange={(e) => updateSettings({ scaleDegreesRootPc: Number(e.target.value) })}
                >
                  {ALL_ROOTS.map((pc) => (
                    <option key={pc} value={pc}>{pitchClassToDisplayName(pc)}</option>
                  ))}
                </select>
              </label>
              <label className="data-field">
                <span>Scale</span>
                <select
                  value={settings.scaleDegreesScaleKey}
                  onChange={(e) => updateSettings({ scaleDegreesScaleKey: e.target.value })}
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
              <label className="data-field">
                <span>Labels</span>
                <select
                  value={settings.scaleDegreesLabels}
                  onChange={(e) => updateSettings({ scaleDegreesLabels: e.target.value })}
                >
                  <option value="numbers">Numbers</option>
                  <option value="solfege">Solfège</option>
                </select>
              </label>
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary>Drone</summary>
          <div className="settings-body">
            <div className="session-data-fields">
              <label className="data-field">
                <span>Sound</span>
                <select
                  value={settings.scaleDegreesDrone}
                  onChange={(e) => updateSettings({ scaleDegreesDrone: e.target.value })}
                >
                  <option value="tonic">Tonic</option>
                  <option value="fifth">Tonic + fifth</option>
                  <option value="chord">Tonic chord</option>
                </select>
              </label>
              {/* Same inline caption-and-slider row as the metronome's volume. Never
                  disabled: the drone runs for the whole session by design. */}
              <label className="drone-level">
                <span>Level</span>
                <input
                  type="range"
                  {...NUMERIC_LIMITS.scaleDegreesDroneVolume}
                  value={settings.scaleDegreesDroneVolume}
                  onChange={(e) => updateSettings({ scaleDegreesDroneVolume: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default memo(ScaleDegreesControls);
