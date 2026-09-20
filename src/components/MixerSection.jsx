import LevelSlider from './LevelSlider';

// PROTOTYPE (#58, layout B): every level in one place, like a mixer's channel strip —
// the tonal center, the metronome (with its on/off), and on Scale Degrees the drone.
// Compare against layout A, where each slider sits with the settings responsible for
// its sound. One of the two gets deleted once the comparison is made.
export default function MixerSection({ settings, updateSettings, showDrone = false }) {
  return (
    <details className="settings-section mixer" open>
      <summary>Mixer</summary>
      <div className="settings-body">
        <LevelSlider
          label="Tone"
          value={settings.toneVolume}
          onChange={(toneVolume) => updateSettings({ toneVolume })}
        />
        {showDrone && (
          <LevelSlider
            label="Drone"
            value={settings.scaleDegreesDroneVolume}
            onChange={(scaleDegreesDroneVolume) => updateSettings({ scaleDegreesDroneVolume })}
          />
        )}
        <div className="mixer-channel">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.metronomeAudio}
              onChange={(e) => updateSettings({ metronomeAudio: e.target.checked })}
            />
          </label>
          <LevelSlider
            label="Metronome"
            value={settings.metronomeVolume}
            onChange={(metronomeVolume) => updateSettings({ metronomeVolume })}
            disabled={!settings.metronomeAudio}
          />
        </div>
      </div>
    </details>
  );
}
