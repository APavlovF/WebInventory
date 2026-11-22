import { useI18n, LANGUAGES, type Lang } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import { alpha, c, type ThemeName } from '../theme/themes';

const THEME_BUTTONS: { name: ThemeName; icon: React.ReactNode }[] = [
    {
        name: 'warm',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2h8l4 10H4L8 2Z" />
                <path d="M12 12v6" />
                <path d="M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z" />
            </svg>
        ),
    },
    {
        name: 'dark',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
        ),
    },
    {
        name: 'light',
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
        ),
    },
];

const LANG_ORDER: Lang[] = ['ru', 'es', 'pt', 'en'];

export default function PreferencesBar() {
    const { theme, setTheme } = useTheme();
    const { lang, setLang, t } = useI18n();

    const orderedLanguages = LANG_ORDER.map(
        (code) => LANGUAGES.find((l) => l.code === code)!
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme icon buttons: Lamp (warm), Moon (night), Sun (light) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {THEME_BUTTONS.map(({ name, icon }) => {
                    const active = theme === name;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setTheme(name)}
                            aria-label={t(`theme.${name}`)}
                            title={t(`theme.${name}`)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '26px',
                                height: '26px',
                                padding: 0,
                                borderRadius: '6px',
                                border: active ? `1px solid ${alpha('accent', 0.5)}` : '1px solid transparent',
                                backgroundColor: active ? alpha('accent', 0.15) : 'transparent',
                                color: active ? c.accent : c.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {icon}
                        </button>
                    );
                })}
            </div>

            <span style={{ width: '1px', height: '16px', backgroundColor: c.borderSubtle }} />

            {/* World icon + Language buttons: RU, ES, PT, EN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span
                    aria-hidden="true"
                    title={t('prefs.language')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: c.textMuted,
                        marginRight: '2px',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                    </svg>
                </span>

                {orderedLanguages.map((item) => {
                    const active = lang === item.code;
                    return (
                        <button
                            key={item.code}
                            type="button"
                            onClick={() => setLang(item.code)}
                            aria-label={item.label}
                            title={item.label}
                            style={{
                                padding: '3px 6px',
                                fontSize: '11px',
                                fontWeight: active ? 700 : 500,
                                fontFamily: 'monospace',
                                borderRadius: '5px',
                                border: active ? `1px solid ${alpha('accent', 0.5)}` : '1px solid transparent',
                                backgroundColor: active ? alpha('accent', 0.15) : 'transparent',
                                color: active ? c.accent : c.textMuted,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {item.code.toUpperCase()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}