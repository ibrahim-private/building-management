import { useEffect } from 'react';
import { useSettings } from '@/hooks/useData';

const THEME_COLORS = { light: '#059669', dark: '#0b0f14' } as const;

/** Applies theme + primary colour from Settings to <html> (and mirrors them for first paint). */
export function ThemeEffect() {
  const settings = useSettings();

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
    root.setAttribute('data-primary', settings.primaryColor);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[settings.theme]);
    try {
      localStorage.setItem('bm-theme', settings.theme);
      localStorage.setItem('bm-primary', settings.primaryColor);
    } catch {
      /* storage can be unavailable (private mode); the DB value still applies */
    }
  }, [settings]);

  return null;
}
