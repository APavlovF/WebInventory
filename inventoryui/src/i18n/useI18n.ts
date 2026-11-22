import { createContext, useContext } from 'react';
import type { TKey } from './en';

export type Lang = 'en' | 'pt' | 'es' | 'ru';

// label = the language's own name; locale = used for number/date formatting (Intl)
export const LANGUAGES: { code: Lang; label: string; locale: string }[] = [
    { code: 'en', label: 'English', locale: 'en-US' },
    { code: 'pt', label: 'Português', locale: 'pt-BR' },
    { code: 'es', label: 'Español', locale: 'es-ES' },
    { code: 'ru', label: 'Русский', locale: 'ru-RU' },
];

export interface I18nContextValue {
    lang: Lang;
    locale: string;
    setLang: (lang: Lang) => void;
    t: (key: TKey, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
    return ctx;
}