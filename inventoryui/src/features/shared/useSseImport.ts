// src/features/shared/useSseImport.ts
import { useState, useRef, useCallback } from 'react';
import { apiFetch, isDemoMode } from '../../api';
import { useI18n } from '../../i18n/useI18n';

interface UseSseImportOptions<T> {
    onSuccess: (result: T) => void;
    onError?: (message: string) => void;
    onNotice?: (message: string) => void;
}

export function useSseImport<T>({ onSuccess, onError, onNotice }: UseSseImportOptions<T>) {
    const { t } = useI18n();
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string>(t('buy.preparing'));
    const abortControllerRef = useRef<AbortController | null>(null);

    const cancelImport = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const runSseImport = useCallback(
        async (endpoint: string, init: RequestInit = { method: 'POST' }) => {
            if (isDemoMode()) {
                onNotice?.(t('buy.importDemoDisabled'));
                return;
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            setIsImporting(true);
            setImportStatus(t('buy.connecting'));

            try {
                const response = await apiFetch(endpoint, {
                    ...init,
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    throw new Error(t('err.notAuthorized'));
                }
                if (!response.ok || !response.body) {
                    throw new Error(t('buy.errImport', { status: response.status }));
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let parsedResult: T | null = null;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const events = buffer.split('\n\n');
                    buffer = events.pop() ?? '';

                    for (const rawEvent of events) {
                        let eventType = 'message';
                        let dataStr = '';

                        for (const line of rawEvent.split('\n')) {
                            if (line.startsWith('event: ')) {
                                eventType = line.slice(7).trim();
                            } else if (line.startsWith('data: ')) {
                                dataStr += line.slice(6);
                            }
                        }

                        if (!dataStr) continue;
                        const payload = JSON.parse(dataStr);

                        if (eventType === 'status') {
                            setImportStatus(payload.message);
                        } else if (eventType === 'error') {
                            throw new Error(payload.message);
                        } else if (eventType === 'result') {
                            parsedResult = payload as T;
                        }
                    }
                }

                if (!Array.isArray(parsedResult) || parsedResult.length === 0) {
                    throw new Error(t('buy.errNoItems'));
                }

                onSuccess(parsedResult);
                return parsedResult;
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    onError?.(t('buy.errCanceled'));
                } else {
                    onError?.(err instanceof Error ? err.message : t('buy.errParsing'));
                }
            } finally {
                abortControllerRef.current = null;
                setIsImporting(false);
            }
        },
        [onError, onNotice, onSuccess, t]
    );

    return {
        isImporting,
        importStatus,
        runSseImport,
        cancelImport,
    };
}