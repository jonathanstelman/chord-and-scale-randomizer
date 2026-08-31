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
        <h1>Chord and Scale Randomizer</h1>
        <p className="masthead-subtitle">
          A <strong>tonal center</strong> is the root note, chord, or scale your ear is
          currently focused on. This tool switches to a new one at random, on a timer, so
          you can practice hearing and responding to changes.
        </p>
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
    </div>
  );
}
