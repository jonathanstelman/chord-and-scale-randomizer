import { useRef } from 'react';
import { useSettings } from './hooks/useSettings';
import { useRandomizer, pickNextForPureTone, pickNextForScaleDegrees } from './hooks/useRandomizer';
import { droneNotes, scaleDegreesKey } from './music/scaleDegrees';
import TabNav from './components/TabNav';
import ThemeToggle from './components/ThemeToggle';
import Chair from './components/Chair';
import Controls from './components/Controls';
import PureToneControls from './components/PureToneControls';
import ScaleDegreesControls from './components/ScaleDegreesControls';
import Display from './components/Display';
import PipConsole from './components/PipConsole';
import { tabAccent } from './components/tabs';
import './App.css';

// See docs/architecture/randomizer.md's "Tab copy" section for why these are
// comparable in shape rather than each written independently.
const TAB_DESCRIPTIONS = {
  randomizer: (
    <>
      Random triads, seventh chords, and scales — identify what&rsquo;s playing, or
      play along, before the next one comes.
    </>
  ),
  pureTone: (
    <>
      A single random pitch, with nothing sounding around it — name it, or find it on
      your instrument, before the next one comes.
    </>
  ),
  scaleDegrees: (
    <>
      A drone sets the key, then a random note above it — name its scale degree, or find
      it on your instrument, before the next one comes.
    </>
  ),
};

// PROTOTYPE (#58): `?layout=mixer` shows layout B (one Mixer group for every level);
// the default is layout A (each level with the settings responsible for its sound).
// Removed, along with the loser, once the comparison is made.
const LAYOUT = new URLSearchParams(window.location.search).get('layout') === 'mixer' ? 'mixer' : 'local';

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
  const isScaleDegrees = settings.activeTab === 'scaleDegrees';
  const {
    isRunning, isPaused, current, queue, beatIndex, totalBeats, isGap, start, pause, resume, stop,
  } = useRandomizer(settings, isScaleDegrees
    ? {
      pickNextTonalCenter: pickNextForScaleDegrees,
      forceSoundType: 'chord',
      drone: {
        notes: droneNotes(settings.scaleDegreesRootPc, scaleDegreesKey(settings), settings.scaleDegreesDrone),
        volume: settings.scaleDegreesDroneVolume,
      },
    }
    : isPureTone
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
    /* The active mode's accent, for anything page-level that carries it — today the
       masthead's divider. The tab underline and the idle chair take theirs directly. */
    <div className="app" style={{ '--mode-accent': `var(--${tabAccent(settings.activeTab)})` }}>
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
          Each mode below plays something new at random, on a metronome — a chord, a
          scale, a pitch, or a scale degree — so you can practice reacting when it changes.
        </p>
        <TabNav activeTab={settings.activeTab} onSelect={handleSelectTab} />
        <p className="masthead-subtitle">{TAB_DESCRIPTIONS[settings.activeTab]}</p>
      </header>

      <Display
        ref={displayRef}
        settings={settings}
        updateSettings={updateSettings}
        current={current}
        queue={queue}
        isRunning={isRunning}
        isPaused={isPaused}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        isGap={isGap}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onStop={stop}
      />

      <PipConsole
        displayRef={displayRef}
        current={current}
        queue={queue}
        showCurrent={settings.showCurrent}
        showNext={settings.showNext}
        labelStyle={settings.scaleDegreesLabels}
        isRunning={isRunning}
        isPaused={isPaused}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        isGap={isGap}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onStop={stop}
      />

      {isScaleDegrees ? (
        <ScaleDegreesControls settings={settings} updateSettings={updateSettings} layout={LAYOUT} />
      ) : isPureTone ? (
        <PureToneControls
          settings={settings}
          updateSettings={updateSettings}
          toggleRoot={toggleRoot}
          setAllRootsEnabled={setAllRootsEnabled}
          layout={LAYOUT}
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
          layout={LAYOUT}
        />
      )}
    </div>
  );
}
