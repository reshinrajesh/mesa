import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './palette';
import { elevation, layout, motion, radius, screenGutter, spacing, touchTarget } from './tokens';
import { fontFamilies, maxFontSizeMultiplier, textVariants } from './typography';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  motion: typeof motion;
  layout: typeof layout;
  elevation: ReturnType<typeof elevation>;
  text: typeof textVariants;
  fonts: typeof fontFamilies;
  maxFontSizeMultiplier: typeof maxFontSizeMultiplier;
  screenGutter: number;
  touchTarget: number;
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const PREFERENCE_KEY = 'mesa.theme-preference';

function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palettes[scheme],
    spacing,
    radius,
    motion,
    layout,
    elevation: elevation(scheme),
    text: textVariants,
    fonts: fontFamilies,
    maxFontSizeMultiplier,
    screenGutter,
    touchTarget,
  };
}

const fallbackTheme = buildTheme('light');

const ThemeContext = createContext<ThemeContextValue>({
  theme: fallbackTheme,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PREFERENCE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // A missing preference is not an error worth surfacing; system wins.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREFERENCE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: buildTheme(scheme), preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}
