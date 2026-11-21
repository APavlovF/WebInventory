// src/demo/demoSeedData.ts
// ---------------------------------------------------------------------------------------------
//  THE STARTING DATA OF THE DEMO: the only file you need to edit.
//
//  When a visitor opens the site in demo mode, these lists are COPIED into that visitor's own demo
//  database (kept in the browser tab). The visitor can then buy, produce, sell, edit and delete as
//  much as he likes: only his copy changes. These lists are frozen at runtime, so nothing can
//  modify them, and every new visit starts again from exactly what is written here.
//
//  Rules
//   - Names must be unique inside each list (upper/lower case is ignored). A repeated name is skipped
//     and a warning appears in the browser console ("[demo seed] ...").
//   - Products refer to materials by NAME, so write the name exactly as in SEED_MATERIALS.
//   - Prices are NOT written for products: they are calculated like the "Add product type" window does it
//     ((materials + work cost) x markup, then the commissions in the order listed).
//   - Percentages are written as percentages: 20 means 20 %.
//   - After saving this file the demo data is rebuilt automatically (no need to clear anything).
//
//  The rows below are EXAMPLES: replace them with your own.
// ---------------------------------------------------------------------------------------------

/** A material that is already in the warehouse. */
export interface SeedMaterial {
    name: string;          // e.g. 'Oak planks'
    sku: string;           // e.g. 'OAK-01'
    measurement: string;   // unit of measurement: 'm', 'kg', 'pcs', 'l'...
    quantity: number;      // how much is in stock
    price: number;         // price per ONE unit of measurement
    lowStockAlert?: number; // optional: alert when stock falls to this (default 0)
    maxStockAlert?: number; // optional: alert when stock reaches this (default: no limit)
}

/** A commission or tax that can be added to a product (shown in the "Commissions and Taxes" list). */
export interface SeedCommission {
    name: string;    // e.g. 'Sales tax'
    percent: number; // 10 = 10 %
}

/** A product type, with its recipe. */
export interface SeedProduct {
    name: string;                // e.g. 'Wooden table'
    sku: string;                 // e.g. 'TBL-01'
    markupPercent?: number;      // default 0
    workCost?: number;           // labour cost per product, default 0
    retailRatePercent?: number;  // retail price = wholesale + this %, default 0
    items: { material: string; quantity: number }[]; // recipe: material NAME + quantity for ONE product
    commissions?: { name: string; percent: number }[]; // optional; added to SEED_COMMISSIONS automatically
    stock?: number;              // optional: how many are already produced and in stock (default 0)
    lowStockAlert?: number;      // optional
    maxStockAlert?: number;      // optional
}

// ---------------------------------------------------------------------------------------------
//  1. MATERIALS
// ---------------------------------------------------------------------------------------------
export const SEED_MATERIALS: readonly SeedMaterial[] = [
    { name: 'Oak planks', sku: 'OAK-01', measurement: 'm', quantity: 120, price: 12.5, lowStockAlert: 20, maxStockAlert: 500 },
    { name: 'Steel bolts', sku: 'BOLT-M8', measurement: 'pcs', quantity: 800, price: 0.35, lowStockAlert: 100 },
    { name: 'Varnish', sku: 'VRN-1L', measurement: 'l', quantity: 25, price: 9.9, lowStockAlert: 5 },
    { name: 'Glass', sku: 'GLS-4', measurement: 'm2', quantity: 30, price: 18 },
];

// ---------------------------------------------------------------------------------------------
//  2. COMMISSIONS / TAXES available in the list (even if no product uses them yet).
//     Commissions written inside a product below are added here automatically.
// ---------------------------------------------------------------------------------------------
export const SEED_COMMISSIONS: readonly SeedCommission[] = [
    { name: 'Sales tax', percent: 10 },
    { name: 'Marketplace fee', percent: 5 },
];

// ---------------------------------------------------------------------------------------------
//  3. PRODUCTS
// ---------------------------------------------------------------------------------------------
export const SEED_PRODUCTS: readonly SeedProduct[] = [
    {
        name: 'Wooden table',
        sku: 'TBL-01',
        markupPercent: 20,
        workCost: 40,
        retailRatePercent: 35,
        items: [
            { material: 'Oak planks', quantity: 4 },
            { material: 'Steel bolts', quantity: 16 },
            { material: 'Varnish', quantity: 0.5 },
        ],
        commissions: [{ name: 'Sales tax', percent: 10 }],
        stock: 6,
    },
    {
        name: 'Bookshelf',
        sku: 'SHF-01',
        markupPercent: 15,
        workCost: 20,
        retailRatePercent: 30,
        items: [
            { material: 'Oak planks', quantity: 2.5 },
            { material: 'Steel bolts', quantity: 8 },
        ],
        stock: 10,
    },
];
