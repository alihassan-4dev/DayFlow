import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultPreferences } from '../data/content';
import { Preferences } from '../data/types';

interface PreferencesContextValue {
  prefs: Preferences;
  ready: boolean;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const PREFERENCES_KEY = 'dayflow.preferences';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCES_KEY)
      .then((stored) => {
        if (stored) setPrefs((previous) => ({ ...previous, ...JSON.parse(stored) }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const value = useMemo(() => ({ prefs, ready, setPref }), [prefs, ready, setPref]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
