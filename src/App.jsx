import { useSettings } from './hooks/useSettings';
import { useRandomizer } from './hooks/useRandomizer';
import Controls from './components/Controls';
import Display from './components/Display';
import './App.css';

export default function App() {
  const { settings, updateSettings, toggleType, setModeEnabled } = useSettings();
  const {
    isRunning, current, next, beatIndex, totalBeats, isGap, start, stop,
  } = useRandomizer(settings);

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-title">
          <span className="masthead-eyebrow">Vol. I — Modal Randomizer</span>
          <h1>Ear Trainer</h1>
        </div>
        <span className="masthead-catalog">EN&#8209;4060</span>
      </header>

      <Display
        current={current}
        next={next}
        showCurrent={settings.showCurrent}
        showNext={settings.showNext}
        isRunning={isRunning}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        isGap={isGap}
      />

      <Controls
        settings={settings}
        updateSettings={updateSettings}
        toggleType={toggleType}
        setModeEnabled={setModeEnabled}
        isRunning={isRunning}
        onStart={start}
        onStop={stop}
      />

      <footer className="liner-credit">Recorded live — no two takes alike.</footer>
    </div>
  );
}
