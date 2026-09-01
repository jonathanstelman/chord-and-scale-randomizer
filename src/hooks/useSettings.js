import { useCallback, useEffect, useState } from 'react';
import { ALL_ROOTS, DEFAULT_ENABLED_TYPES, typeKeysInCategories } from '../music/pool';

const STORAGE_KEY = 'chord-scale-randomizer-settings';

const DEFAULT_SETTINGS = {
  bpm: 60,
  minBeats: 4,
  maxBeats: 4, // equal by default: a single "Duration", not a range, until the user opts in
  gapBeats: 0, // silent beats inserted between tonal centers, 0 = no gap
  soundType: 'chord', // 'chord' | 'arpeggio' | 'pad' | 'none'
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
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Stable identities (useCallback) so Controls — a memoized component with a lot of
  // checkboxes — doesn't see "new" callback props and re-render on every beat tick just
  // because App re-rendered for an unrelated reason (the beat counter, the turntable).
  const updateSettings = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);

  // Manually editing types/roots always exits Guitar-style "explicit pairs" mode (see
  // enabledPairs above) — the checkboxes only mean something when the pool is being
  // built from enabledTypes/enabledRoots, not from a fixed pair list.
  const toggleType = useCallback((key) => {
    setSettings((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(key)
        ? prev.enabledTypes.filter((k) => k !== key)
        : [...prev.enabledTypes, key],
      enabledPairs: null,
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
      return { ...prev, enabledTypes, enabledPairs: null };
    });
  }, []);

  const toggleRoot = useCallback((pc) => {
    setSettings((prev) => ({
      ...prev,
      enabledRoots: prev.enabledRoots.includes(pc)
        ? prev.enabledRoots.filter((r) => r !== pc)
        : [...prev.enabledRoots, pc],
      enabledPairs: null,
    }));
  }, []);

  const setAllRootsEnabled = useCallback((enabled) => {
    setSettings((prev) => ({
      ...prev,
      enabledRoots: enabled ? [...ALL_ROOTS] : [],
      enabledPairs: null,
    }));
  }, []);

  // Unlike setModeEnabled (which toggles one category on/off against whatever's already
  // enabled), a preset replaces enabledTypes outright — picking one is a clean reset to
  // exactly its categories, not a merge. Guitar is the exception: it sets `pairs`
  // instead, and deliberately leaves enabledTypes/enabledRoots untouched (see PRESETS in
  // pool.js) so any other preset, or a manual edit, cleanly supersedes it.
  const applyPreset = useCallback((preset) => {
    setSettings((prev) => ({
      ...prev,
      ...(preset.categories ? { enabledTypes: typeKeysInCategories(preset.categories) } : {}),
      enabledPairs: preset.pairs ?? null,
      ...(preset.bpm !== undefined ? { bpm: preset.bpm } : {}),
    }));
  }, []);

  return {
    settings, updateSettings, toggleType, setModeEnabled, toggleRoot, setAllRootsEnabled, applyPreset,
  };
}
