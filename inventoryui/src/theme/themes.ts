// src/theme/themes.ts
// ONE place for every colour in the app. Components never write hex colours:
//   backgroundColor: c.bgSurface                      -> "var(--bg-surface)"
//   border: `1px solid ${alpha('accent', 0.4)}`        -> "rgb(var(--accent-rgb) / 0.4)"
// Switching theme = applyTheme(name), which rewrites the CSS variables on <html>.
// To add a theme: add one palette below and one entry in `themes` (+ its name in the translations).

export type ThemeName = 'dark' | 'light' | 'warm';
export const THEME_NAMES: ThemeName[] = ['dark', 'light', 'warm'];

const dark = {
    bgApp: '#0f172a',        // app background, sidebar, modals
    bgMain: '#020617',       // main area behind the content
    bgSurface: '#1e293b',    // cards, table headers, inputs
    bgMap: '#070a13',        // map canvas and road asphalt
    border: '#334155',
    borderSubtle: '#1e293b',
    text: '#f8fafc',
    textStrong: '#e2e8f0',
    textMuted: '#94a3b8',
    accent: '#14b8a6',       // buttons, active items, highlights
    accentBright: '#2dd4bf', // totals, focus glow
    onAccent: '#020617',     // text on top of an accent background
    info: '#38bdf8',
    danger: '#fb7185',
    warning: '#f59e0b',
    success: '#22c55e',
    overlay: '#000000',      // base colour of modal backdrops and shadows
};

export type TokenName = keyof typeof dark;
type Palette = Record<TokenName, string>;

const light: Palette = {
    bgApp: '#f1f5f9',
    bgMain: '#ffffff',
    bgSurface: '#f8fafc',
    bgMap: '#e8eef5',
    border: '#cbd5e1',
    borderSubtle: '#e2e8f0',
    text: '#0f172a',
    textStrong: '#1e293b',
    textMuted: '#64748b',
    accent: '#0d9488',
    accentBright: '#0f766e',
    onAccent: '#ffffff',
    info: '#0284c7',
    danger: '#e11d48',
    warning: '#d97706',
    success: '#16a34a',
    overlay: '#0f172a',
};

const warm: Palette = {
    bgApp: '#1c1410',
    bgMain: '#140e0b',
    bgSurface: '#2a1f19',
    bgMap: '#110b08',
    border: '#4a372b',
    borderSubtle: '#2a1f19',
    text: '#fdf6ee',
    textStrong: '#f3e6d6',
    textMuted: '#b5a08c',
    accent: '#f59e0b',
    accentBright: '#fbbf24',
    onAccent: '#1c1410',
    info: '#7dd3fc',
    danger: '#fb7185',
    warning: '#fb923c',
    success: '#a3e635',
    overlay: '#000000',
};

export const themes: Record<ThemeName, { scheme: 'dark' | 'light'; palette: Palette }> = {
    dark: { scheme: 'dark', palette: dark },
    light: { scheme: 'light', palette: light },
    warm: { scheme: 'dark', palette: warm },
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const TOKEN_NAMES = Object.keys(dark) as TokenName[];

/** Colour references for inline styles: c.bgApp -> "var(--bg-app)" */
export const c = Object.fromEntries(TOKEN_NAMES.map((n) => [n, `var(--${kebab(n)})`])) as Record<TokenName, string>;

/** Same colour with transparency: alpha('accent', 0.4) */
export const alpha = (name: TokenName, a: number) => `rgb(var(--${kebab(name)}-rgb) / ${a})`;

const hexToTriplet = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export function applyTheme(name: ThemeName) {
    const { scheme, palette } = themes[name];
    const root = document.documentElement;
    for (const token of TOKEN_NAMES) {
        root.style.setProperty(`--${kebab(token)}`, palette[token]);
        root.style.setProperty(`--${kebab(token)}-rgb`, hexToTriplet(palette[token]));
    }
    root.dataset.theme = name;
    root.style.colorScheme = scheme; // native scrollbars, inputs, etc. follow the theme
}
