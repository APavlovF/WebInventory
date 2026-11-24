// src/features/market/useMaterialImport.ts
import { useState, useRef, useMemo, useCallback } from 'react';
import { apiFetch, isDemoMode } from '../../api';
import { useI18n } from '../../i18n/useI18n';
import { getUnitKey } from '../shared/uniqueKey';
import type { Unit } from '../../types/inventory';
import type { BuyRow, ImportedMaterialItem } from '../../types/inventory';

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

interface UseMaterialImportOptions {
    units: Unit[];
    onSuccess: (rows: BuyRow[]) => void;
    onError?: (message: string) => void;
    onNotice?: (message: string) => void;
}

export function useMaterialImport({
    units,
    onSuccess,
    onError,
    onNotice,
}: UseMaterialImportOptions) {
    const { t } = useI18n();
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string>(t('buy.preparing'));
    const abortControllerRef = useRef<AbortController | null>(null);

    const { unitByKey, unitsByName } = useMemo(() => {
        const byKey = new Map<string, Unit>();
        const byName = new Map<string, Unit[]>();

        units.forEach((u) => {
            const k = getUnitKey(u);
            if (k) byKey.set(k, u);

            const n = norm(u.name);
            if (n) {
                const list = byName.get(n) ?? [];
                list.push(u);
                byName.set(n, list);
            }
        });

        return { unitByKey: byKey, unitsByName: byName };
    }, [units]);

    const mapItemsToRows = useCallback(
        (items: ImportedMaterialItem[]): BuyRow[] =>
            items.map((item) => {
                const rawSku = (item.unit?.sku ?? item.sku ?? '').trim();
                const rawName = (item.unit?.name ?? item.name ?? '').trim();
                const rawMeasurement = (item.unit?.measurement ?? item.measurement ?? '').trim();

                const itemKey = getUnitKey({ sku: rawSku, name: rawName, measurement: rawMeasurement });
                const matchedUnit =
                    (itemKey ? unitByKey.get(itemKey) : undefined) ??
                    (unitsByName.get(norm(rawName))?.length === 1
                        ? unitsByName.get(norm(rawName))![0]
                        : undefined);

                return {
                    rowId: crypto.randomUUID(),
                    sku: matchedUnit?.sku ?? rawSku,
                    name: matchedUnit ? matchedUnit.name : rawName,
                    quantity: String(item.quantity ?? 1),
                    price: String(item.price ?? 0),
                    measurement: matchedUnit ? matchedUnit.measurement : rawMeasurement,
                };
            }),
        [unitByKey, unitsByName]
    );

    const cancelImport = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const runImport = useCallback(
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
                let parsedItems: ImportedMaterialItem[] | null = null;

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
                            parsedItems = payload;
                        }
                    }
                }

                if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
                    throw new Error(t('buy.errNoItems'));
                }

                const rows = mapItemsToRows(parsedItems);
                onSuccess(rows);
                return rows;
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
        [mapItemsToRows, onError, onNotice, onSuccess, t]
    );

    return {
        isImporting,
        importStatus,
        runImport,
        cancelImport,
    };
}