const TABS = [
  { key: 'randomizer', label: 'Chords & Scales' },
  { key: 'pureTone', label: 'Pure Tone' },
];

// Switches which practice mode is showing — see docs/architecture/randomizer.md's
// "Practice tabs" section for why this is plain in-app state rather than routes.
export default function TabNav({ activeTab, onSelect }) {
  return (
    <div className="tab-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab-button${tab.key === activeTab ? ' is-active' : ''}`}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
