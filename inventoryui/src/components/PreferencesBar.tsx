// src/components/PreferencesBar.tsx
// Theme and language switchers. Put it wherever you like (sidebar footer, header...).
import { useI18n, LANGUAGES, type Lang } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import { THEME_NAMES, c, type ThemeName } from '../theme/themes';

const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '6px 8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: c.bgSurface,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
};

export default function PreferencesBar() {
    const { theme, setTheme } = useTheme();
    const { lang, setLang, t } = useI18n();

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            <select
                aria-label={t('prefs.theme')}
                title={t('prefs.theme')}
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
                style={selectStyle}
            >
                {THEME_NAMES.map((name) => (
                    <option key={name} value={name}>{t(`theme.${name}`)}</option>
                ))}
            </select>
            <select
                aria-label={t('prefs.language')}
                title={t('prefs.language')}
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                style={selectStyle}
            >
                {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                ))}
            </select>
        </div>
    );
}
