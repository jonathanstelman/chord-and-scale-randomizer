import { useRef } from 'react';
import { useSettings } from './hooks/useSettings';
import { useRandomizer, pickNextForPureTone } from './hooks/useRandomizer';
import TabNav from './components/TabNav';
import ThemeToggle from './components/ThemeToggle';
import Chair from './components/Chair';
import Controls from './components/Controls';
import PureToneControls from './components/PureToneControls';
import Display from './components/Display';
import PipConsole from './components/PipConsole';
import './App.css';

// See docs/architecture/randomizer.md's "Tab copy" section for why these are
// comparable in shape rather than each written independently.
const TAB_DESCRIPTIONS = {
  randomizer: (
    <>
      Random triads, seventh chords, and scale-tone chords — identify what&rsquo;s
      playing, or play along, before the next one comes.
    </>
  ),
  pureTone: (
    <>
      A single random pitch, no chord or scale context — name it, or find it on your
      instrument, before the next one comes.
    </>
  ),
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

  // One shared clock across tabs — see docs/architecture/randomizer.md's "Practice tabs"
  // section.
  const isPureTone = settings.activeTab === 'pureTone';
  const {
    isRunning, current, next, beatIndex, totalBeats, isGap, start, stop,
  } = useRandomizer(settings, isPureTone
    ? { pickNextTonalCenter: pickNextForPureTone, forceSoundType: 'chord' }
    : {});

  // PipConsole watches this element to know when the display has scrolled away.
  const displayRef = useRef(null);

  // See docs/architecture/randomizer.md's "Practice tabs" section for why switching
  // stops a running session first.
  const handleSelectTab = (tab) => {
    if (isRunning) stop();
    setActiveTab(tab);
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-top">
          {/* Upright, tipping, fallen — left to right, that's the game. Purely
              decorative: the wordmark beside them already names the app. */}
          <div className="masthead-lockup">
            <h1>Musical Chairs</h1>
            <span className="masthead-chairs" aria-hidden="true">
              <Chair pose="upright" size={34} />
              <Chair pose="tipping" size={34} className="chair-tipping" />
              <Chair pose="fallen" size={40} className="chair-fallen" />
            </span>
          </div>
          <ThemeToggle theme={settings.theme} onSelect={(theme) => updateSettings({ theme })} />
        </div>
        <p className="masthead-subtitle">
          Each mode below sets a new <strong>tonal center</strong> — a root note, chord,
          or scale — at random, on a metronome, so you can practice reacting when it changes.
        </p>
        <TabNav activeTab={settings.activeTab} onSelect={handleSelectTab} />
        <p className="masthead-subtitle">{TAB_DESCRIPTIONS[settings.activeTab]}</p>
      </header>

      <Display
        ref={displayRef}
        settings={settings}
        updateSettings={updateSettings}
        current={current}
        next={next}
        isRunning={isRunning}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        isGap={isGap}
        onStart={start}
        onStop={stop}
      />

      <PipConsole
        displayRef={displayRef}
        current={current}
        next={next}
        showCurrent={settings.showCurrent}
        showNext={settings.showNext}
        isRunning={isRunning}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        isGap={isGap}
        onStop={stop}
      />

      {isPureTone ? (
        <PureToneControls
          settings={settings}
          updateSettings={updateSettings}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
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
        />
      )}
    </div>
  );
}
