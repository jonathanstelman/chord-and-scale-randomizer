const TABS = [
  { key: 'randomizer', label: 'Chords & Scales' },
  { key: 'pureTone', label: 'Pure Tone' },
];

// Switches which practice mode is showing — see issue #6 / docs/architecture/
// randomizer.md's Pure Tone section: plain in-app tab state, no router, since every
// mode shares this one static page. Stopping a running session before switching is the
// caller's job (see App.jsx) — two tabs never share a live session.
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
