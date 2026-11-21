// src/demo/demoDb.ts
// The demo "database": plain data kept in memory and mirrored to sessionStorage, so a page refresh
// keeps it but closing the tab/browser loses it. It mirrors the C# entities, one list per table.
// A new session starts as a COPY of the starting lists in demoSeedData.ts (see demoSeed.ts).
import { NO_MAX_LIMIT } from '../types/inventory';
import { buildSeedDb, SEED_HASH } from './demoSeed';

export interface DemoUnit { id: number; name: string; measurement: string; sku: string }
export interface DemoUnitStock {
    id: number;
    unitId: number;
    quantity: number;
    price: number;
    lowStockAlert: number;
    maxStockAlert: number;
    isDeleted: boolean;
}
export interface DemoItem { id: number; quantity: number; unitId: number }
export interface DemoProduct {
    id: number;
    name: string;
    sku: string;
    price: number;
    retailRate: number;
    markup: number;
    workCost: number;
    isDeleted: boolean;
    items: DemoItem[];
    commissionIds: number[];
}
export interface DemoProductStock {
    id: number;
    productId: number;
    quantity: number;
    lowStockAlert: number;
    maxStockAlert: number;
}
export interface DemoCommission { id: number; name: string; rate: number }

export interface DemoDb {
    seedHash: string; // which version of the starting data this copy was made from
    nextId: number; // one counter for every table, so ids never repeat
    units: DemoUnit[];
    unitStocks: DemoUnitStock[];
    products: DemoProduct[];
    productStocks: DemoProductStock[];
    commissions: DemoCommission[];
}

export const DEFAULT_LOW_STOCK = 0;
export const DEFAULT_MAX_STOCK = NO_MAX_LIMIT; // "no limit", same meaning as in the real app

const STORAGE_KEY = 'demo_db_v1';
let memoryDb: DemoDb | null = null;

const emptyDb = (): DemoDb => ({
    seedHash: SEED_HASH,
    nextId: 1,
    units: [],
    unitStocks: [],
    products: [],
    productStocks: [],
    commissions: [],
});

function looksValid(x: any): x is DemoDb {
    return (
        x &&
        x.seedHash === SEED_HASH && // a copy of older starting data (or an older schema) is replaced
        typeof x.nextId === 'number' &&
        Array.isArray(x.units) &&
        Array.isArray(x.unitStocks) &&
        Array.isArray(x.products) &&
        Array.isArray(x.productStocks) &&
        Array.isArray(x.commissions)
    );
}

// A brand-new copy of the starting data (an empty demo if the starting data cannot be built)
function freshDb(): DemoDb {
    try {
        return buildSeedDb();
    } catch (err) {
        console.error('[demo seed] could not be built, starting empty:', err);
        return emptyDb();
    }
}

export function loadDb(): DemoDb {
    if (memoryDb) return memoryDb;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (looksValid(parsed)) {
                memoryDb = parsed;
                return parsed;
            }
        }
    } catch {
        /* storage unavailable or corrupted: start empty */
    }
    memoryDb = freshDb();
    return memoryDb;
}

export function saveDb(): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb));
    } catch {
        /* storage full or blocked: the data still lives in memory for this page */
    }
}

/** Puts back a snapshot taken with JSON.stringify(db), used when a request fails half-way */
export function restoreDb(snapshot: string): void {
    memoryDb = JSON.parse(snapshot);
}

/** Throws away the visitor's changes and starts again from the starting data (handy for a "Reset demo" button) */
export function resetDemoDb(): void {
    memoryDb = freshDb();
    saveDb();
}
