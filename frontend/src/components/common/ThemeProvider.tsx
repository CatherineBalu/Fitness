import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import type { Theme } from './themeContext';

const STORAGE_KEY = 'theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

function resolveSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' || (theme === 'system' && resolveSystemPrefersDark());
  root.classList.toggle('dark', isDark);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <ThemeContext value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext>
  );
}
