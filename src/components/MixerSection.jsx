// Every level in one place, like a mixer: a channel strip per sound source — what the
// tab plays (`played`: a tonal center or a note — the name follows the tab the
// way its description does), on Scale Degrees the drone, and the metronome — each with
// the same three things in the same three columns: name, mute, level. *What* plays
// stays with the settings responsible for it (the Voicing and Drone groups); this group
// is only how loud. See docs/architecture/randomizer.md's "Mixer".
function Channel({
  name, on, onToggle, level, onLevel,
}) {
  return (
    <div className="mixer-channel">
      <span className="mixer-channel-name">{name}</span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`${name} on`}
        title={on ? `Mute ${name.toLowerCase()}` : `Unmute ${name.toLowerCase()}`}
      />
      <input
        type="range" min="0" max="100"
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
        disabled={!on}
        aria-label={`${name} level`}
      />
    </div>
  );
}

export default function MixerSection({
  settings, updateSettings, played, showDrone = false,
}) {
  return (
    <details className="settings-section" open>
      <summary>Mixer</summary>
      <div className="settings-body mixer">
        <Channel
          name={played}
          on={settings.toneAudio}
          onToggle={(toneAudio) => updateSettings({ toneAudio })}
          level={settings.toneVolume}
          onLevel={(toneVolume) => updateSettings({ toneVolume })}
        />
        {showDrone && (
          <Channel
            name="Drone"
            on={settings.droneAudio}
            onToggle={(droneAudio) => updateSettings({ droneAudio })}
            level={settings.scaleDegreesDroneVolume}
            onLevel={(scaleDegreesDroneVolume) => updateSettings({ scaleDegreesDroneVolume })}
          />
        )}
        <Channel
          name="Metronome"
          on={settings.metronomeAudio}
          onToggle={(metronomeAudio) => updateSettings({ metronomeAudio })}
          level={settings.metronomeVolume}
          onLevel={(metronomeVolume) => updateSettings({ metronomeVolume })}
        />
      </div>
    </details>
  );
}
