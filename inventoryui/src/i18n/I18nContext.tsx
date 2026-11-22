import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TKey } from './en';
import { pt } from './pt';
import { es } from './es';
import { ru } from './ru';
import { I18nContext, LANGUAGES, type I18nContextValue, type Lang } from './useI18n';

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