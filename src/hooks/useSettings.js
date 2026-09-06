import { useCallback, useEffect, useState } from 'react';
import { ALL_ROOTS, DEFAULT_ENABLED_TYPES, typeKeysInCategories } from '../music/pool';

const STORAGE_KEY = 'chord-scale-randomizer-settings';

const DEFAULT_SETTINGS = {
  // Which practice tab is showing — see docs/architecture/randomizer.md's Pure Tone
  // section for why tabs share this one settings object instead of each owning its own
  // storage key. 'randomizer' | 'pureTone'.
  activeTab: 'randomizer',
  // 'system' follows the OS/browser preference; 'light'/'dark' is an explicit override.
  // See docs/architecture/theming.md.
  theme: 'system',
  bpm: 60,
  minBeats: 4,
  maxBeats: 4, // equal by default: a single "Duration", not a range, until the user opts in
  gapBeats: 0, // silent beats inserted between tonal centers, 0 = no gap
  soundType: 'chord', // 'chord' | 'arpeggio' | 'none'
  maxChordNotes: 5,
  showCurrent: true,
  showNext: false,
  metronomeAudio: true,
  metronomeVolume: 50, // 0-100, independent of the tonal-center sound (or its absence)
  enabledTypes: DEFAULT_ENABLED_TYPES,
  enabledRoots: [...ALL_ROOTS], // which of the 12 pitch classes are fair game as a root
  // Non-null = draw only from this explicit {rootPc, typeKey} list (see Guitar in
  // PRESETS), bypassing enabledTypes/enabledRoots entirely. Cleared back to null by any
  // manual type/root edit, so "customize from here" falls back to whatever
  // enabledTypes/enabledRoots held before the preset was applied.
  enabledPairs: null,
  // See docs/architecture/settings-and-presets.md for what this tracks and when it's
  // cleared.
  activePresetKey: null,
  customBankText: '', // raw textarea contents, persisted so a reload keeps what was typed
  customBankEntries: [], // last successfully-parsed [{rootPc, typeKey}] — what playback reads
  customBankMode: 'random', // 'random' | 'ordered'
  customBankEnabled: false,
  // Pure Tone tab's note source — see docs/architecture/randomizer.md's Pure Tone
  // section. Unlike activePresetKey, never cleared by another edit: it's the persisted
  // choice itself, not a description of one.
  pureToneMode: 'chromatic', // 'chromatic' | 'scale'
  pureToneScaleRootPc: 0, // C
  pureToneScaleKey: 'diatonic:Ionian', // major scale — the classic solfège "do"
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    // 'pad' was retired as its own sound (its synth is now just what 'chord' plays) —
    // remap a persisted 'pad' choice so the sound select shows a valid option instead of
    // going blank. The engine would already play it correctly either way (anything that
    // isn't 'arpeggio'/'none' hits the same code path), this is purely a UI nicety.
    if (loaded.soundType === 'pad') loaded.soundType = 'chord';
    return loaded;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Mirrors settings.theme onto the document so index.css's [data-theme="..."] rules
  // can see it — 'system' removes the attribute entirely rather than setting it to an
  // empty string, so the CSS falls through to prefers-color-scheme with nothing
  // overriding it either way. See docs/architecture/theming.md.
  useEffect(() => {
    if (settings.theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  // Stable identities (useCallback) so Controls — a memoized component with a lot of
  // checkboxes — doesn't see "new" callback props and re-render on every beat tick just
  // because App re-rendered for an unrelated reason (the beat counter, the turntable).
  const updateSettings = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);

  // Manually editing types/roots always exits Guitar-style "explicit pairs" mode and
  // custom-bank mode — the checkboxes only mean something when the pool is being built
  // from enabledTypes/enabledRoots, not from a fixed pair list.
  const toggleType = useCallback((key) => {
    setSettings((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(key)
        ? prev.enabledTypes.filter((k) => k !== key)
        : [...prev.enabledTypes, key],
      enabledPairs: null,
      activePresetKey: null,
      customBankEnabled: false,
    }));
  }, []);

  // Enables/disables every type under a core mode (e.g. all four "Extended" scale
  // families) in one shot, for the top-level mode checkboxes.
  const setModeEnabled = useCallback((mode, enabled) => {
    setSettings((prev) => {
      const keys = typeKeysInCategories(mode.categories);
      const enabledTypes = enabled
        ? Array.from(new Set([...prev.enabledTypes, ...keys]))
        : prev.enabledTypes.filter((k) => !keys.includes(k));
      return {
        ...prev, enabledTypes, enabledPairs: null, activePresetKey: null, customBankEnabled: false,
      };
    });
  }, []);

  const toggleRoot = useCallback((pc) => {
    setSettings((prev) => ({
      ...prev,
      enabledRoots: prev.enabledRoots.includes(pc)
        ? prev.enabledRoots.filter((r) => r !== pc)
        : [...prev.enabledRoots, pc],
      enabledPairs: null,
      activePresetKey: null,
      customBankEnabled: false,
    }));
  }, []);

  const setAllRootsEnabled = useCallback((enabled) => {
    setSettings((prev) => ({
      ...prev,
      enabledRoots: enabled ? [...ALL_ROOTS] : [],
      enabledPairs: null,
      activePresetKey: null,
      customBankEnabled: false,
    }));
  }, []);

  // Unlike setModeEnabled (which toggles one category on/off against whatever's already
  // enabled), a categories preset replaces enabledTypes outright — a clean reset, not a
  // merge. Guitar and Beginner are the exception (see docs/architecture/
  // settings-and-presets.md): they set `pairs` instead and leave enabledTypes/
  // enabledRoots untouched.
  const applyPreset = useCallback((preset) => {
    setSettings((prev) => ({
      ...prev,
      ...(preset.categories ? { enabledTypes: typeKeysInCategories(preset.categories) } : {}),
      enabledPairs: preset.pairs ?? null,
      activePresetKey: preset.key,
      customBankEnabled: false,
      ...(preset.bpm !== undefined ? { bpm: preset.bpm } : {}),
    }));
  }, []);

  // Just the raw textarea contents — parsing (and committing a new customBankEntries)
  // happens separately, on blur, in Controls.jsx.
  const setCustomBankText = useCallback((text) => {
    setSettings((prev) => ({ ...prev, customBankText: text }));
  }, []);

  const commitCustomBank = useCallback((entries) => {
    setSettings((prev) => ({
      ...prev,
      customBankEntries: entries,
      // An empty bank can't be "in use" — avoid leaving a checked-but-disabled checkbox
      // behind if the user clears their typed text back out.
      customBankEnabled: entries.length > 0 ? prev.customBankEnabled : false,
    }));
  }, []);

  const setCustomBankMode = useCallback((mode) => {
    setSettings((prev) => ({ ...prev, customBankMode: mode }));
  }, []);

  // Turning custom-bank mode on exits Guitar-style "explicit pairs" mode, the same way
  // Guitar exits custom-bank mode above — only one special source governs playback at a
  // time; the general enabledTypes/enabledRoots filters are untouched either way.
  const setCustomBankEnabled = useCallback((enabled) => {
    setSettings((prev) => ({
      ...prev,
      customBankEnabled: enabled,
      enabledPairs: enabled ? null : prev.enabledPairs,
      activePresetKey: enabled ? null : prev.activePresetKey,
    }));
  }, []);

  const setActiveTab = useCallback((tab) => {
    setSettings((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  return {
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
  };
}
