// src/demo/demoSeed.ts
// Turns the lists of demoSeedData.ts into a fresh demo database. It only READS the lists (they are
// frozen) and builds brand new objects, so the originals can never be changed by a visitor.
import { NO_MAX_LIMIT } from '../types/inventory';
import type { DemoDb } from './demoDb';
import { SEED_COMMISSIONS, SEED_MATERIALS, SEED_PRODUCTS } from './demoSeedData';

// Raise this number when the shape of DemoDb changes: saved sessions of the old shape are then discarded
const DEMO_SCHEMA_VERSION = 1;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

// Mirrors Product.ApplyRate on the C# side (and applyRate in AddProductTypeModal)
function applyRate(price: number, rate: number): number {
    if (rate === 0) return price;
    if (rate < 0) {
        const denom = 1 - Math.abs(rate);
        return denom === 0 ? price : price / denom;
    }
    return price * (1 + rate);
}

// Frozen: any attempt to change the starting lists throws instead of silently altering them
function deepFreeze<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value as object).forEach(deepFreeze);
    }
    return value;
}
deepFreeze(SEED_MATERIALS);
deepFreeze(SEED_COMMISSIONS);
deepFreeze(SEED_PRODUCTS);

const hash = (text: string) => {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
};

/** Changes whenever the starting data (or the schema) changes: an old saved session is then replaced */
export const SEED_HASH = `${DEMO_SCHEMA_VERSION}-${hash(JSON.stringify([SEED_MATERIALS, SEED_COMMISSIONS, SEED_PRODUCTS]))}`;

const warn = (message: string) => console.warn(`[demo seed] ${message}`);
const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const key = (name: string) => name.trim().toLowerCase();

export function buildSeedDb(): DemoDb {
    const db: DemoDb = {
        seedHash: SEED_HASH,
        nextId: 1,
        units: [],
        unitStocks: [],
        products: [],
        productStocks: [],
        commissions: [],
    };

    // ----- materials
    const unitIdByName = new Map<string, number>();
    const priceByUnitId = new Map<number, number>();
    for (const m of SEED_MATERIALS) {
        const name = String(m.name ?? '').trim();
        if (!name) {
            warn('a material without a name was skipped.');
            continue;
        }
        if (unitIdByName.has(key(name))) {
            warn(`material "${name}" appears twice: the second one was skipped.`);
            continue;
        }
        const quantity = num(m.quantity, NaN);
        const price = num(m.price, NaN);
        if (!(quantity >= 0) || !(price >= 0)) {
            warn(`material "${name}" needs a quantity and a price of 0 or more: skipped.`);
            continue;
        }

        const unitId = db.nextId++;
        db.units.push({ id: unitId, name, measurement: String(m.measurement ?? ''), sku: String(m.sku ?? '') });
        db.unitStocks.push({
            id: db.nextId++,
            unitId,
            quantity,
            price,
            lowStockAlert: num(m.lowStockAlert, 0),
            maxStockAlert: num(m.maxStockAlert, NO_MAX_LIMIT),
            isDeleted: false,
        });
        unitIdByName.set(key(name), unitId);
        priceByUnitId.set(unitId, price);
    }

    // ----- commissions (one entry per name + rate)
    const commissionIdByKey = new Map<string, number>();
    const commissionId = (rawName: string, percent: number): number | null => {
        const name = String(rawName ?? '').trim();
        const rate = r6(num(percent, NaN) / 100);
        if (!name || !Number.isFinite(rate)) return null;
        const k = `${key(name)}|${rate}`;
        let id = commissionIdByKey.get(k);
        if (id === undefined) {
            id = db.nextId++;
            db.commissions.push({ id, name, rate });
            commissionIdByKey.set(k, id);
        }
        return id;
    };
    for (const c of SEED_COMMISSIONS) {
        if (commissionId(c.name, c.percent) === null) warn(`a commission needs a name and a percent: skipped.`);
    }

    // ----- products
    const productNames = new Set<string>();
    for (const p of SEED_PRODUCTS) {
        const name = String(p.name ?? '').trim();
        if (!name) {
            warn('a product without a name was skipped.');
            continue;
        }
        if (productNames.has(key(name))) {
            warn(`product "${name}" appears twice: the second one was skipped.`);
            continue;
        }
        productNames.add(key(name));

        const items: { id: number; quantity: number; unitId: number }[] = [];
        let materialsCost = 0;
        for (const it of p.items ?? []) {
            const unitId = unitIdByName.get(key(String(it.material ?? '')));
            const quantity = num(it.quantity, NaN);
            if (unitId === undefined || !(quantity > 0)) {
                warn(`product "${name}": material "${it.material}" is unknown or its quantity is not above 0: that line was skipped.`);
                continue;
            }
            items.push({ id: db.nextId++, quantity, unitId });
            materialsCost += (priceByUnitId.get(unitId) ?? 0) * quantity;
        }

        const markupPercent = num(p.markupPercent, 0);
        const workCost = num(p.workCost, 0);
        const retailPercent = num(p.retailRatePercent, 0);

        // Same calculation as the "Add product type" window
        let price = (materialsCost + workCost) * (1 + markupPercent / 100);
        const commissionIds: number[] = [];
        for (const c of p.commissions ?? []) {
            const id = commissionId(c.name, c.percent);
            if (id === null) {
                warn(`product "${name}": a commission needs a name and a percent: skipped.`);
                continue;
            }
            commissionIds.push(id);
            price = applyRate(price, r6(num(c.percent, 0) / 100));
        }

        const productId = db.nextId++;
        db.products.push({
            id: productId,
            name,
            sku: String(p.sku ?? ''),
            price: r6(price),
            retailRate: r6(1 + retailPercent / 100),
            markup: r6(1 + markupPercent / 100),
            workCost: r6(workCost),
            isDeleted: false,
            items,
            commissionIds,
        });

        const stock = num(p.stock, 0);
        if (stock > 0) {
            db.productStocks.push({
                id: db.nextId++,
                productId,
                quantity: stock,
                lowStockAlert: num(p.lowStockAlert, 0),
                maxStockAlert: num(p.maxStockAlert, NO_MAX_LIMIT),
            });
        }
    }

    return db;
}
