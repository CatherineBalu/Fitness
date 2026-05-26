import { useEffect, useState } from 'react';

import { ThemeContext } from './themeContext';

import type { Theme } from './themeContext';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'theme';

function resolveSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === 'light' || value === 'dark') return value;
  // No stored preference yet — fall back to the OS setting on first visit.
  return resolveSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext>
  );
}
