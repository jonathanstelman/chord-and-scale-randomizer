import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ENABLED_TYPES, typeKeysInCategories } from '../music/pool';

const STORAGE_KEY = 'ear-training-settings';

const DEFAULT_SETTINGS = {
  bpm: 60,
  minBeats: 2,
  maxBeats: 8,
  gapBeats: 0, // silent beats inserted between tonal centers, 0 = no gap
  soundType: 'chord', // 'chord' | 'arpeggio' | 'pad' | 'none'
  maxChordNotes: 5,
  showCurrent: true,
  showNext: false,
  metronomeAudio: true,
  metronomeVolume: 50, // 0-100, independent of the tonal-center sound (or its absence)
  enabledTypes: DEFAULT_ENABLED_TYPES,
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

  const toggleType = useCallback((key) => {
    setSettings((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(key)
        ? prev.enabledTypes.filter((k) => k !== key)
        : [...prev.enabledTypes, key],
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
      return { ...prev, enabledTypes };
    });
  }, []);

  return { settings, updateSettings, toggleType, setModeEnabled };
}
