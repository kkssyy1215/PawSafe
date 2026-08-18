import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pawsafe.voice-accessibility.v1';

interface VoiceAccessibilitySettings {
  guidanceEnabled: boolean;
}

interface VoiceAccessibilityContextValue extends VoiceAccessibilitySettings {
  setGuidanceEnabled: (enabled: boolean) => void;
}

const DEFAULT_SETTINGS: VoiceAccessibilitySettings = {
  guidanceEnabled: true,
};

const VoiceAccessibilityContext = createContext<VoiceAccessibilityContextValue | null>(null);

export function VoiceAccessibilityProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<VoiceAccessibilitySettings>;
        setSettings({
          guidanceEnabled: parsed.guidanceEnabled ?? true,
        });
      }
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [hydrated, settings]);

  const value = useMemo<VoiceAccessibilityContextValue>(() => ({
    ...settings,
    setGuidanceEnabled: (guidanceEnabled) => setSettings((current) => ({ ...current, guidanceEnabled })),
  }), [settings]);

  return <VoiceAccessibilityContext.Provider value={value}>{children}</VoiceAccessibilityContext.Provider>;
}

export function useVoiceAccessibility() {
  const value = useContext(VoiceAccessibilityContext);
  if (!value) throw new Error('useVoiceAccessibility must be used inside VoiceAccessibilityProvider');
  return value;
}
