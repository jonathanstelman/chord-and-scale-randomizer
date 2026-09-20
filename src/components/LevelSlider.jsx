// One captioned 0-100 slider, the same row wherever a level is set — the metronome's,
// the tonal center's, the drone's — so a slider looks the same in every group.
export default function LevelSlider({
  label, value, onChange, disabled = false, className = '',
}) {
  return (
    <label className={`level-slider${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <input
        type="range" min="0" max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
    </label>
  );
}
