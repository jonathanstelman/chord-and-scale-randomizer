import { useSettings } from './hooks/useSettings';
import { useRandomizer, pickNextForPureTone } from './hooks/useRandomizer';
import TabNav from './components/TabNav';
import Controls from './components/Controls';
import PureToneControls from './components/PureToneControls';
import Display from './components/Display';
import './App.css';

// Comparable in shape on purpose (see docs/architecture/randomizer.md): each names what
// randomizes in this tab, then what you do about it, ending on the same "before the next
// one comes" beat — so switching tabs reads as switching *content*, not switching how
// the app talks to you. The shared "tonal center" concept (root note, chord, or scale)
// lives once, in the app-purpose blurb above the tabs, rather than repeated/redefined
// per tab.
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

  return (
    <div className="app">
      <header className="masthead">
        <h1>Musical Chairs</h1>
        <p className="masthead-subtitle">
          Each mode below sets a new <strong>tonal center</strong> — a root note, chord,
          or scale — at random, on a timer, so you can practice reacting when it changes.
        </p>
        <TabNav activeTab={settings.activeTab} onSelect={handleSelectTab} />
        <p className="masthead-subtitle">{TAB_DESCRIPTIONS[settings.activeTab]}</p>
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
