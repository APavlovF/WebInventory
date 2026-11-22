import { useLayoutEffect, useState, type ReactNode } from 'react';
import { applyTheme, THEME_NAMES, type ThemeName } from './themes';
import { ThemeContext } from './useTheme';

const STORAGE_KEY = 'ui_theme'; // a preference: kept in the browser in demo mode and logged-in mode alike

function initialTheme(): ThemeName {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
        if (saved && THEME_NAMES.includes(saved)) return saved;
    } catch { /* storage unavailable */ }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeName>(initialTheme);

    // Layout effect: variables are set before the browser paints, so there is no flash
    useLayoutEffect(() => {
        applyTheme(theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}