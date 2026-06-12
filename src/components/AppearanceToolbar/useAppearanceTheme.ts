import { useEffect, useMemo, useState } from 'react';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type ResolvedAppearanceTheme = 'light' | 'dark';

export const appearanceStorageKey = 'excel-sanitizer:appearance';

const appearancePreferences: AppearancePreference[] = ['light', 'system', 'dark'];

export function useAppearanceTheme() {
  const [preference, setPreference] = useState<AppearancePreference>(() => readStoredAppearancePreference());
  const [systemTheme, setSystemTheme] = useState<ResolvedAppearanceTheme>(() => getSystemAppearanceTheme());

  useEffect(() => {
    localStorage.setItem(appearanceStorageKey, preference);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme);
    };
  }, []);

  const resolvedTheme = useMemo<ResolvedAppearanceTheme>(
    () => (preference === 'system' ? systemTheme : preference),
    [preference, systemTheme],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return {
    preference,
    resolvedTheme,
    setPreference,
  };
}

function readStoredAppearancePreference(): AppearancePreference {
  const storedPreference = localStorage.getItem(appearanceStorageKey);
  return isAppearancePreference(storedPreference) ? storedPreference : 'light';
}

function isAppearancePreference(value: string | null): value is AppearancePreference {
  return appearancePreferences.includes(value as AppearancePreference);
}

function getSystemAppearanceTheme(): ResolvedAppearanceTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
