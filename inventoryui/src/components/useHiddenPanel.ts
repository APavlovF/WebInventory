// src/components/useHiddenPanel.ts
// "Is this floating card minimised?" remembered for the browser tab (sessionStorage), so the choice
// survives switching screens and refreshing the page, but a new visit starts with the cards visible.
import { useState } from 'react';

export function useHiddenPanel(key: string) {
    const storageKey = `ui_hidden_${key}`;

    const [hidden, setHiddenState] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem(storageKey) === '1';
        } catch {
            return false;
        }
    });

    const setHidden = (value: boolean) => {
        setHiddenState(value);
        try {
            if (value) sessionStorage.setItem(storageKey, '1');
            else sessionStorage.removeItem(storageKey);
        } catch {
            /* storage blocked: the choice still works until the page is closed */
        }
    };

    return [hidden, setHidden] as const;
}
