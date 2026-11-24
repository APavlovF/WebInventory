// src/features/market/useMaterialImport.ts
import { useMemo, useCallback } from 'react';
import { getUnitKey } from '../shared/uniqueKey';
import type { Unit } from '../../types/inventory';
import type { BuyRow, ImportedMaterialItem } from '../../types/inventory';
import { useSseImport } from './useSseImport';

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
    const { isImporting, importStatus, runSseImport, cancelImport } = useSseImport<ImportedMaterialItem[]>({
        onSuccess: (parsedItems) => onSuccess(mapItemsToRows(parsedItems)),
        onError,
        onNotice,
    });

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
                const rawSku = (item.unit?.sku ?? '').trim();
                const rawName = (item.unit?.name ?? '').trim();
                const rawMeasurement = (item.unit?.measurement ?? '').trim();

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

    return {
        isImporting,
        importStatus,
        runImport: runSseImport,
        cancelImport,
    };
}