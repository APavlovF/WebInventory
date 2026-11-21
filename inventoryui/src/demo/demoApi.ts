// src/demo/demoApi.ts
// A tiny fake backend for demo mode. apiFetch() sends here every request that would go to the C# API
// when nobody is signed in, and gets back a normal Response. The rules below copy the C# controllers
// (ProductController, MarketController, WarehouseController, OfficeController), so the screens
// cannot tell the difference and need no demo-specific code.
import {
    DEFAULT_LOW_STOCK,
    DEFAULT_MAX_STOCK,
    loadDb,
    restoreDb,
    saveDb,
    type DemoDb,
    type DemoItem,
    type DemoProduct,
    type DemoProductStock,
    type DemoUnitStock,
} from './demoDb';

// Avoid floating-point noise (the C# side uses decimal)
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const text = (message: string, status: number) => new Response(message, { status });
const ok = () => new Response(null, { status: 200 });

// ---------- what the API returns (same JSON shape as the controllers) ----------

const unitDto = (db: DemoDb, unitId: number) => {
    const u = db.units.find((x) => x.id === unitId)!;
    return { id: u.id, name: u.name, measurement: u.measurement, sku: u.sku };
};

const stockDto = (db: DemoDb, s: DemoUnitStock) => ({
    id: s.id,
    isDeleted: s.isDeleted,
    lowStockAlert: s.lowStockAlert,
    maxStockAlert: s.maxStockAlert,
    price: s.price,
    quantity: s.quantity,
    unit: unitDto(db, s.unitId),
});

const productDto = (db: DemoDb, p: DemoProduct) => ({
    id: p.id,
    commissions: p.commissionIds
        .map((id) => db.commissions.find((x) => x.id === id))
        .filter((x) => x !== undefined)
        .map((x) => ({ id: x!.id, name: x!.name, rate: x!.rate })),
    isDeleted: p.isDeleted,
    name: p.name,
    price: p.price,
    retailRate: p.retailRate,
    markup: p.markup,
    workCost: p.workCost,
    sku: p.sku,
    items: p.items.map((i) => ({ id: i.id, quantity: i.quantity, unit: unitDto(db, i.unitId) })),
});

const productStockDto = (db: DemoDb, s: DemoProductStock) => {
    const p = db.products.find((x) => x.id === s.productId)!;
    return {
        id: s.id,
        lowStockAlert: s.lowStockAlert,
        maxStockAlert: s.maxStockAlert,
        quantity: s.quantity,
        product: { id: p.id, isDeleted: p.isDeleted, name: p.name, price: p.price, retailRate: p.retailRate, sku: p.sku },
    };
};

// Removed ("deleted") rows are hidden everywhere, as the Remove dialogs promise
const liveUnitStocks = (db: DemoDb) => db.unitStocks.filter((s) => !s.isDeleted);
const liveProductStocks = (db: DemoDb) =>
    db.productStocks.filter((s) => !db.products.find((p) => p.id === s.productId)?.isDeleted);

const unitStocksByName = (db: DemoDb) => {
    const map = new Map<string, DemoUnitStock>();
    liveUnitStocks(db).forEach((s) => map.set(unitDto(db, s.unitId).name, s));
    return map;
};
const productStocksByName = (db: DemoDb) => {
    const map = new Map<string, DemoProductStock>();
    liveProductStocks(db).forEach((s) => {
        const p = db.products.find((x) => x.id === s.productId)!;
        map.set(p.name, s);
    });
    return map;
};

type Handler = (db: DemoDb, body: any) => Response;

// ---------- reads ----------

const READ: Record<string, Handler> = {
    '/api/product/fetch': (db) => json(db.products.filter((p) => !p.isDeleted).map((p) => productDto(db, p))),
    '/api/product/stock': (db) => json(liveProductStocks(db).map((s) => productStockDto(db, s))),
    '/api/materials/fetch': (db) => json(liveUnitStocks(db).map((s) => stockDto(db, s))),
    '/api/office/fetch': (db) => json(db.commissions),
};

// Shared by /add and /update: checks the units of the recipe and resolves the commissions
// (ResolveCommissions: an existing id is reused, new ones are created once per name and rate)
function resolveProductParts(db: DemoDb, p: any): { items: DemoItem[]; commissionIds: number[] } | Response {
    const items: DemoItem[] = [];
    for (const item of p.items ?? []) {
        const unit = db.units.find((u) => u.id === item.unit?.id);
        if (!unit) return text(`Unit ${item.unit?.id} does not exist.`, 400);
        items.push({ id: db.nextId++, quantity: Number(item.quantity), unitId: unit.id });
    }

    const createdByKey = new Map<string, number>();
    const commissionIds: number[] = [];
    for (const c of p.commissions ?? []) {
        if (c.id > 0 && db.commissions.some((x) => x.id === c.id)) {
            commissionIds.push(c.id);
            continue;
        }
        const name = String(c.name).trim();
        const rate = Number(c.rate);
        const key = `${name}|${rate}`;
        let id = createdByKey.get(key);
        if (id === undefined) {
            id = db.nextId++;
            db.commissions.push({ id, name, rate });
            createdByKey.set(key, id);
        }
        commissionIds.push(id);
    }
    return { items, commissionIds };
}

// ---------- writes ----------

const WRITE: Record<string, Handler> = {
    // ProductController.CreateProduct
    '/api/product/add': (db, p) => {
        if (!p) return text('Product data is required.', 400);
        const parts = resolveProductParts(db, p);
        if (parts instanceof Response) return parts;

        const product: DemoProduct = {
            id: db.nextId++,
            name: String(p.name),
            sku: String(p.sku),
            price: Number(p.price),
            retailRate: Number(p.retailRate),
            markup: Number(p.markup ?? 1),
            workCost: Number(p.workCost ?? 0),
            isDeleted: false,
            items: parts.items,
            commissionIds: parts.commissionIds,
        };
        db.products.push(product);
        return json(productDto(db, product), 201);
    },

    // Edit an existing product type: same body as /add plus the product's id. The recipe (items) and the
    // commissions are replaced by the ones sent; the product's stock is untouched.
    '/api/product/update': (db, p) => {
        if (!p) return text('Product data is required.', 400);
        const product = db.products.find((x) => x.id === p.id && !x.isDeleted);
        if (!product) return text(`Product ${p.id} does not exist.`, 404);

        const name = String(p.name).trim().toLowerCase();
        if (db.products.some((x) => x.id !== product.id && !x.isDeleted && x.name.trim().toLowerCase() === name)) {
            return text(`A product named "${p.name}" already exists.`, 409);
        }

        const parts = resolveProductParts(db, p);
        if (parts instanceof Response) return parts;

        product.name = String(p.name);
        product.sku = String(p.sku);
        product.price = Number(p.price);
        product.retailRate = Number(p.retailRate);
        product.markup = Number(p.markup ?? 1);
        product.workCost = Number(p.workCost ?? 0);
        product.items = parts.items;
        product.commissionIds = parts.commissionIds;
        return json(productDto(db, product));
    },

    // ProductController.AddBatch: adds product stock and consumes the recipe's materials
    '/api/product/batch': (db, list) => {
        const entries: any[] = Array.isArray(list) ? list : [];
        const stockByName = productStocksByName(db);
        const materials = unitStocksByName(db);

        for (const entry of entries) {
            const qty = Number(entry.quantity);
            const existing = stockByName.get(entry.product?.name);
            let product: DemoProduct | undefined;

            if (existing) {
                existing.quantity = r6(existing.quantity + qty);
                product = db.products.find((p) => p.id === existing.productId);
            } else {
                product = db.products.find((p) => p.id === entry.product?.id && !p.isDeleted);
                if (!product) return text(`Product ${entry.product?.id} does not exist.`, 400);
                db.productStocks.push({
                    id: db.nextId++,
                    productId: product.id,
                    quantity: qty,
                    lowStockAlert: DEFAULT_LOW_STOCK,
                    maxStockAlert: DEFAULT_MAX_STOCK,
                });
            }

            for (const item of product?.items ?? []) {
                const stock = materials.get(unitDto(db, item.unitId).name);
                if (stock) stock.quantity = r6(stock.quantity - item.quantity * qty);
            }
        }
        return ok();
    },

    // Produce and sell in one step: the materials are used, but no product stock is added
    '/api/product/batch-sell': (db, list) => {
        const entries: any[] = Array.isArray(list) ? list : [];
        const materials = unitStocksByName(db);

        for (const entry of entries) {
            const qty = Number(entry.quantity);
            const product = db.products.find((p) => p.id === entry.product?.id && !p.isDeleted);
            if (!product) return text(`Product ${entry.product?.id} does not exist.`, 400);

            for (const item of product.items) {
                const stock = materials.get(unitDto(db, item.unitId).name);
                if (stock) stock.quantity = r6(stock.quantity - item.quantity * qty);
            }
        }
        return ok();
    },

    // MarketController.AddMaterials: weighted-average price for known materials, new stock otherwise
    '/api/market/materials': (db, list) => {
        const entries: any[] = Array.isArray(list) ? list : [];
        const byName = unitStocksByName(db);

        for (const m of entries) {
            const qty = Number(m.quantity);
            const price = Number(m.price);
            const existing = byName.get(m.unit?.name);

            if (existing) {
                const totalQty = r6(existing.quantity + qty);
                if (existing.price !== price && totalQty > 0) {
                    existing.price = r6((existing.price * existing.quantity + price * qty) / totalQty);
                }
                existing.quantity = totalQty;
            } else {
                let unit = db.units.find((u) => u.id === m.unit?.id);
                if (!unit) {
                    unit = {
                        id: db.nextId++,
                        name: String(m.unit?.name ?? '').trim(),
                        measurement: String(m.unit?.measurement ?? ''),
                        sku: String(m.unit?.sku ?? ''),
                    };
                    db.units.push(unit);
                }
                db.unitStocks.push({
                    id: db.nextId++,
                    unitId: unit.id,
                    quantity: qty,
                    price,
                    lowStockAlert: DEFAULT_LOW_STOCK,
                    maxStockAlert: DEFAULT_MAX_STOCK,
                    isDeleted: false,
                });
            }
        }
        return ok();
    },

    // MarketController.SellProducts
    '/api/market/sell': (db, list) => {
        const entries: any[] = Array.isArray(list) ? list : [];
        const stockByName = productStocksByName(db);
        for (const entry of entries) {
            const stock = stockByName.get(entry.product?.name);
            if (stock) stock.quantity = r6(stock.quantity - Number(entry.quantity));
        }
        return ok();
    },

    // WarehouseController.SetMaterialsLimit
    '/api/materials/limit': (db, list) => {
        if (!Array.isArray(list) || list.length === 0) return text('No stock limits provided.', 400);
        for (const incoming of list) {
            const stock = liveUnitStocks(db).find((s) => s.id === incoming.id);
            if (!stock) continue;
            stock.lowStockAlert = Number(incoming.lowStockAlert);
            stock.maxStockAlert = Number(incoming.maxStockAlert);
        }
        return ok();
    },

    // Remove materials / products: soft delete (the recipes of existing products keep their materials)
    '/api/materials/delete': (db, body) => {
        const ids: number[] = body?.unitStockIds ?? [];
        db.unitStocks.forEach((s) => {
            if (ids.includes(s.id)) s.isDeleted = true;
        });
        return ok();
    },
    '/api/product/delete': (db, body) => {
        const ids: number[] = body?.productIds ?? [];
        db.products.forEach((p) => {
            if (ids.includes(p.id)) p.isDeleted = true;
        });
        return ok();
    },
};

// ---------- entry point used by apiFetch() ----------

export async function demoFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const db = loadDb();

    let body: any = null;
    if (typeof init.body === 'string' && init.body) {
        try {
            body = JSON.parse(init.body);
        } catch {
            return text('Invalid JSON.', 400);
        }
    }

    const read = READ[path];
    if (read) return read(db, body);

    const write = WRITE[path];
    if (!write) return text('Not available in demo mode.', 501); // invoice parsing, report exports...

    // Like a database transaction: if the request fails, nothing it changed is kept
    const before = JSON.stringify(db);
    const response = write(db, body);
    if (response.status >= 400) restoreDb(before);
    else saveDb();
    return response;
}
