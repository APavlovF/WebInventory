// src/i18n/I18nContext.tsx
// Usage:  const { t } = useI18n();   t('login.signIn')   t('orders.count', { n: 3 })  // "{n}" in the text
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TKey } from './en';
import { pt } from './pt';
import { es } from './es';
import { ru } from './ru';

export type Lang = 'en' | 'pt' | 'es' | 'ru';

// label = the language's own name; locale = used for number/date formatting (Intl)
export const LANGUAGES: { code: Lang; label: string; locale: string }[] = [
    { code: 'en', label: 'English', locale: 'en-US' },
    { code: 'pt', label: 'Português', locale: 'pt-BR' },
    { code: 'es', label: 'Español', locale: 'es-ES' },
    { code: 'ru', label: 'Русский', locale: 'ru-RU' },
];

const dictionaries: Record<Lang, Record<TKey, string>> = { en, pt, es, ru };
const STORAGE_KEY = 'ui_lang'; // also read by api.ts to send Accept-Language to the backend

function initialLang(): Lang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
        if (saved && saved in dictionaries) return saved;
    } catch { /* storage unavailable */ }
    const browser = navigator.language.slice(0, 2) as Lang;
    return browser in dictionaries ? browser : 'en';
}

interface I18nContextValue {
    lang: Lang;
    locale: string;
    setLang: (lang: Lang) => void;
    t: (key: TKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>(initialLang);

    useLayoutEffect(() => {
        document.documentElement.lang = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    }, [lang]);

    const t = useCallback(
        (key: TKey, params?: Record<string, string | number>) => {
            let text: string = dictionaries[lang][key] ?? dictionaries.en[key];
            if (params) {
                for (const [name, value] of Object.entries(params)) {
                    text = text.split(`{${name}}`).join(String(value));
                }
            }
            return text;
        },
        [lang]
    );

    const value = useMemo<I18nContextValue>(
        () => ({ lang, locale: LANGUAGES.find((l) => l.code === lang)!.locale, setLang, t }),
        [lang, t]
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
    return ctx;
}
