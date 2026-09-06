// "Show current" / "Show next" — shared between the chord/scale randomizer and Pure
// Tone tabs (both feed the same current/next display).
export default function ShowToggles({ settings, updateSettings }) {
  return (
    <div className="toggle-row">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.showCurrent}
          onChange={(e) => updateSettings({ showCurrent: e.target.checked })}
        />
        Show current
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.showNext}
          onChange={(e) => updateSettings({ showNext: e.target.checked })}
        />
        Show next
      </label>
    </div>
  );
}
