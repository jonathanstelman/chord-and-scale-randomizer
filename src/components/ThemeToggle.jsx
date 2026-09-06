const THEMES = [
  { key: 'system', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

// A three-way toggle for settings.theme — see docs/architecture/theming.md. Global to
// the whole app (not per-tab), so it lives in the masthead rather than either practice
// tab's own settings.
export default function ThemeToggle({ theme, onSelect }) {
  return (
    <div className="theme-toggle">
      {THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`theme-toggle-button${t.key === theme ? ' is-active' : ''}`}
          onClick={() => onSelect(t.key)}
          aria-pressed={t.key === theme}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
