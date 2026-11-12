// src/features/workshop/useInventory.ts
// Loads the user's inventory from the API into React state (our "cache").
// Call refresh() whenever the database changed (after adding a product type or producing a batch).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api';
import type { Product, ProductStock, Unit, UnitStock } from '../../types/inventory';

async function postJson<T>(path: string): Promise<T> {
    const response = await apiFetch(path, { method: 'POST' });
    if (response.status === 401) throw new Error('Session expired. Please sign in again.');
    if (!response.ok) throw new Error(`Request failed: ${path} (${response.status})`);
    return response.json();
}

export function useInventory(isLoggedIn: boolean) {
    const [products, setProducts] = useState<Product[]>([]);           // product types with their Items
    const [productStocks, setProductStocks] = useState<ProductStock[]>([]); // how many of each product exist
    const [unitStocks, setUnitStocks] = useState<UnitStock[]>([]);     // how much of each material exists
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Replace these URLs with your real routes
            const [prods, pStocks, uStocks] = await Promise.all([
                postJson<Product[]>('/api/product/fetch'),
                postJson<ProductStock[]>('/api/product/stock'),
                postJson<UnitStock[]>('/api/materials/fetch'),
            ]);
            setProducts(prods);
            setProductStocks(pStocks);
            setUnitStocks(uStocks);
        } catch (err: any) {
            setError(err.message || 'Failed to load inventory.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load when the user logs in, clear when they log out
    useEffect(() => {
        if (isLoggedIn) {
            refresh();
        } else {
            setProducts([]);
            setProductStocks([]);
            setUnitStocks([]);
        }
    }, [isLoggedIn, refresh]);

    // The list of materials for the "Add product type" dropdown (unique units from the stock list)
    const units = useMemo<Unit[]>(() => {
        const map = new Map<number, Unit>();
        unitStocks.forEach((us) => map.set(us.unit.id, us.unit));
        return Array.from(map.values());
    }, [unitStocks]);

    return { products, productStocks, unitStocks, units, isLoading, error, refresh };
}