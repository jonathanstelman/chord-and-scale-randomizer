import LevelSlider from './LevelSlider';

// Metronome on/off + volume — shared by every tab (they use the same metronomeAudio/
// metronomeVolume settings). Rendered inside TimingSection's box, so this is just the
// row's internal layout — no border of its own.
export default function MetronomeControl({ settings, updateSettings }) {
  return (
    <div className="metronome-control">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.metronomeAudio}
          onChange={(e) => updateSettings({ metronomeAudio: e.target.checked })}
        />
        Metronome
      </label>
      <LevelSlider
        label="Volume"
        value={settings.metronomeVolume}
        onChange={(metronomeVolume) => updateSettings({ metronomeVolume })}
        disabled={!settings.metronomeAudio}
      />
    </div>
  );
}
