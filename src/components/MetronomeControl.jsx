// Metronome on/off + volume — shared between the chord/scale randomizer and Pure Tone
// tabs (both use the same metronomeAudio/metronomeVolume settings). Rendered inside
// TimingSection's box, so this is just the row's internal layout — no border of its own.
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
  );
}
