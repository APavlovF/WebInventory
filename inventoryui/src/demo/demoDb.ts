// src/demo/demoDb.ts
// The demo "database": plain data kept in memory and mirrored to sessionStorage, so a page refresh
// keeps it but closing the tab/browser loses it. It mirrors the C# entities, one list per table.
import { NO_MAX_LIMIT } from '../types/inventory';

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
        typeof x.nextId === 'number' &&
        Array.isArray(x.units) &&
        Array.isArray(x.unitStocks) &&
        Array.isArray(x.products) &&
        Array.isArray(x.productStocks) &&
        Array.isArray(x.commissions)
    );
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
    memoryDb = emptyDb();
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

/** Wipes the demo data (not used yet: handy for a future "Reset demo" button) */
export function resetDemoDb(): void {
    memoryDb = emptyDb();
    saveDb();
}
