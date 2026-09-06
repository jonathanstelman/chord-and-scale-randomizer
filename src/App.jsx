import { useSettings } from './hooks/useSettings';
import { useRandomizer, pickNextForPureTone } from './hooks/useRandomizer';
import TabNav from './components/TabNav';
import Controls from './components/Controls';
import PureToneControls from './components/PureToneControls';
import Display from './components/Display';
import './App.css';

const TAB_HEADINGS = {
  randomizer: {
    subtitle: (
      <>
        A <strong>tonal center</strong> is the root note, chord, or scale your ear is
        currently focused on. This tool switches to a new one at random, on a timer, so
        you can practice hearing and responding to changes.
      </>
    ),
  },
  pureTone: {
    subtitle: (
      <>
        A single random pitch, no chord or scale context — practice naming it or finding
        it on your instrument as fast as you can.
      </>
    ),
  },
};

export default function App() {
  const {
    settings,
    updateSettings,
    toggleType,
    setModeEnabled,
    toggleRoot,
    setAllRootsEnabled,
    applyPreset,
    setCustomBankText,
    commitCustomBank,
    setCustomBankMode,
    setCustomBankEnabled,
    setActiveTab,
  } = useSettings();

  // One shared clock (see docs/architecture/randomizer.md's Pure Tone section) — only
  // the "what's next" source and whether soundType is overridden change per tab; start/
  // stop, beat scheduling, and the Display below are identical either way.
  const isPureTone = settings.activeTab === 'pureTone';
  const {
    isRunning, current, next, beatIndex, totalBeats, isGap, start, stop,
  } = useRandomizer(settings, isPureTone
    ? { pickNextTonalCenter: pickNextForPureTone, forceSoundType: 'chord' }
    : {});

  // Switching tabs mid-session would otherwise leave the old tab's segment showing until
  // the next beat boundary, then silently start drawing from the new tab's source —
  // simpler and less surprising to just end the session first.
  const handleSelectTab = (tab) => {
    if (isRunning) stop();
    setActiveTab(tab);
  };

  const heading = TAB_HEADINGS[settings.activeTab];

  return (
    <div className="app">
      <header className="masthead">
        <h1>Chord and Scale Randomizer</h1>
        <TabNav activeTab={settings.activeTab} onSelect={handleSelectTab} />
        <p className="masthead-subtitle">{heading.subtitle}</p>
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

      {isPureTone ? (
        <PureToneControls
          settings={settings}
          updateSettings={updateSettings}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
        />
      ) : (
        <Controls
          settings={settings}
          updateSettings={updateSettings}
          toggleType={toggleType}
          setModeEnabled={setModeEnabled}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
          applyPreset={applyPreset}
          setCustomBankText={setCustomBankText}
          commitCustomBank={commitCustomBank}
          setCustomBankMode={setCustomBankMode}
          setCustomBankEnabled={setCustomBankEnabled}
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
        />
      )}
    </div>
  );
}
