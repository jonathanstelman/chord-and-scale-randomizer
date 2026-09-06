// Cycle order for the single-button toggle below.
const THEME_CYCLE = ['system', 'light', 'dark'];

// Non-emoji glyphs (☀ ☾), matching the app's existing plain-glyph icon language
// (▶ ■ ▸ ▷ elsewhere) rather than colorful emoji. 'system' has no real icon of its own
// — it's "whatever light/dark currently means" — so it reads as the word AUTO instead.
const THEME_DISPLAY = {
  system: 'AUTO',
  light: '☀',
  dark: '☾',
};

const THEME_LABEL = {
  system: 'Auto (follows system)',
  light: 'Light',
  dark: 'Dark',
};

// A single button that cycles settings.theme through system -> light -> dark -> system
// — see docs/architecture/theming.md. Global to the whole app (not per-tab), so it
// lives in the masthead rather than either practice tab's own settings.
export default function ThemeToggle({ theme, onSelect }) {
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onSelect(next)}
      title={`Theme: ${THEME_LABEL[theme]} — click for ${THEME_LABEL[next]}`}
    >
      <span aria-hidden="true" className={theme === 'system' ? 'theme-toggle-text' : 'theme-toggle-icon'}>
        {THEME_DISPLAY[theme]}
      </span>
      <span className="visually-hidden">{`Theme: ${THEME_LABEL[theme]}. Click to switch to ${THEME_LABEL[next]}.`}</span>
    </button>
  );
}
