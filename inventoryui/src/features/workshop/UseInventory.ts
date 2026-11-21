// src/features/workshop/UseInventory.ts
// Loads the inventory into React state (our "cache"). Signed in: from the C# API. Not signed in (demo mode):
// from the in-memory demo backend. Both go through apiFetch(), so this hook does not care which one it is.
// Call refresh() whenever the database changed (after adding a product type or producing a batch).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../api';
import { useI18n } from '../../i18n/I18nContext';
import type { Commission, Product, ProductStock, Unit, UnitStock } from '../../types/inventory';

// The request helper throws this; the hook turns it into a translated message
class ApiError extends Error {
    kind: 'unauthorized' | 'failed';
    path: string;
    status: number;
    constructor(kind: 'unauthorized' | 'failed', path: string, status: number) {
        super(kind);
        this.kind = kind;
        this.path = path;
        this.status = status;
    }
}

async function postJson<T>(path: string): Promise<T> {
    const response = await apiFetch(path, { method: 'POST' });
    if (response.status === 401) throw new ApiError('unauthorized', path, 401);
    if (!response.ok) throw new ApiError('failed', path, response.status);
    return response.json();
}

export function useInventory(isLoggedIn: boolean) {
    const { t } = useI18n();
    // refresh() must not change when the language changes (it would reload the data),
    // so the current translator is read through a ref
    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    const [products, setProducts] = useState<Product[]>([]);           // product types with their Items
    const [productStocks, setProductStocks] = useState<ProductStock[]>([]); // how many of each product exist
    const [unitStocks, setUnitStocks] = useState<UnitStock[]>([]);     // how much of each material exists
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const requestId = useRef(0); // only the newest load may write its result
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (clear = false) => {
        const id = ++requestId.current;
        await Promise.resolve();
        if (id !== requestId.current) return;
        if (clear) {
            setProducts([]);
            setProductStocks([]);
            setUnitStocks([]);
            setCommissions([]);
        }
        setIsLoading(true);
        setError(null);
        try {
            // Replace these URLs with your real routes
            const [prods, pStocks, uStocks, comms] = await Promise.all([
                postJson<Product[]>('/api/product/fetch'),
                postJson<ProductStock[]>('/api/product/stock'),
                postJson<UnitStock[]>('/api/materials/fetch'),
                postJson<Commission[]>('/api/office/fetch'),
            ]);
            if (id !== requestId.current) return; // a newer load (e.g. after login/logout) replaced this one
            setProducts(prods);
            setProductStocks(pStocks);
            setUnitStocks(uStocks);
            setCommissions(comms);
        } catch (err: unknown) {
            if (id !== requestId.current) return;
            const tr = tRef.current;
            if (err instanceof ApiError) {
                setError(
                    err.kind === 'unauthorized'
                        ? tr('err.sessionExpired')
                        : tr('err.requestFailed', { path: err.path, status: err.status })
                );
            } else {
                setError(err instanceof Error ? err.message : tr('err.loadInventory'));
            }
        } finally {
            if (id === requestId.current) setIsLoading(false);
        }
    }, []);

    // Signing in or out switches between two different worlds (database / demo data):
    // drop what is on screen, then load the right one
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refresh(true);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isLoggedIn, refresh]);

    // The list of materials for the "Add product type" dropdown (unique units from the stock list)
    const units = useMemo<Unit[]>(() => {
        const map = new Map<number, Unit>();
        unitStocks.forEach((us) => map.set(us.unit.id, us.unit));
        return Array.from(map.values());
    }, [unitStocks]);

    return { products, productStocks, unitStocks, units, commissions, isLoading, error, refresh };
}
