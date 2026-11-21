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
    { name: 'Glass', sku: 'GLASS', measurement: 'm2', quantity: 30, price: 5.00, lowStockAlert: 5, maxStockAlert: 99999 },
    { name: 'Wood', sku: 'WOOD', measurement: 'pc', quantity: 10, price: 6.50, lowStockAlert: 5, maxStockAlert: 99999 },
    { name: 'LB', sku: 'LB', measurement: 'm', quantity: 132.64, price: 7.85, lowStockAlert: 10, maxStockAlert: 99999 },
    { name: 'Oak Wood Plank', sku: 'OAK-WOOD-PLANK', measurement: 'board foot', quantity: 29, price: 8.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Pine Wood Plank', sku: 'PINE-WOOD-PLANK', measurement: 'board foot', quantity: 12, price: 4.20, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Walnut Wood Plank', sku: 'WALNUT-WOOD-PLANK', measurement: 'board foot', quantity: 1, price: 14.00, lowStockAlert: 1, maxStockAlert: 99999 },
    { name: 'Birch Plywood Sheet 4x8', sku: 'BIRCH-PLYWOOD-SHEET-4X8', measurement: 'sheet', quantity: 18.5, price: 45.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'MDF Board 4x8', sku: 'MDF-BOARD-4X8', measurement: 'sheet', quantity: 20, price: 28.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Steel Square Tube 1 inch', sku: 'STEEL-SQUARE-TUBE-1-INCH', measurement: 'meter', quantity: 4, price: 6.50, lowStockAlert: 4, maxStockAlert: 99999 },
    { name: 'Aluminum Round Rod', sku: 'ALUMINUM-ROUND-ROD', measurement: 'meter', quantity: 13, price: 5.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Brass Sheet 2mm', sku: 'BRASS-SHEET-2MM', measurement: 'square meter', quantity: 10.2, price: 65.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Stainless Steel Sheet', sku: 'STAINLESS-STEEL-SHEET', measurement: 'square meter', quantity: 48, price: 55.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Cast Iron Base', sku: 'CAST-IRON-BASE', measurement: 'piece', quantity: 38, price: 22.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Tempered Glass Panel', sku: 'TEMPERED-GLASS-PANEL', measurement: 'square meter', quantity: 9.2, price: 48.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Frosted Acrylic Sheet', sku: 'FROSTED-ACRYLIC-SHEET', measurement: 'square meter', quantity: 42, price: 32.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Ceramic Tile White', sku: 'CERAMIC-TILE-WHITE', measurement: 'piece', quantity: 32, price: 2.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Marble Slab', sku: 'MARBLE-SLAB', measurement: 'square meter', quantity: 6.6, price: 120.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Granite Slab', sku: 'GRANITE-SLAB', measurement: 'square meter', quantity: 6, price: 95.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Full-Grain Leather', sku: 'FULL-GRAIN-LEATHER', measurement: 'square meter', quantity: 10, price: 85.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Faux Leather PU', sku: 'FAUX-LEATHER-PU', measurement: 'meter', quantity: 18, price: 18.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Linen Upholstery Fabric', sku: 'LINEN-UPHOLSTERY-FABRIC', measurement: 'meter', quantity: 19, price: 16.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Velvet Fabric', sku: 'VELVET-FABRIC', measurement: 'meter', quantity: 34, price: 24.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Canvas Fabric', sku: 'CANVAS-FABRIC', measurement: 'meter', quantity: 43, price: 12.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'High-Density Foam 2 inch', sku: 'HIGH-DENSITY-FOAM-2-INCH', measurement: 'square meter', quantity: 4.5, price: 15.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Polyester Fiberfill', sku: 'POLYESTER-FIBERFILL', measurement: 'kilogram', quantity: 40, price: 7.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Cotton Batting', sku: 'COTTON-BATTING', measurement: 'meter', quantity: 17, price: 6.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Wood Screws 35mm', sku: 'WOOD-SCREWS-35MM', measurement: 'box', quantity: 49.8, price: 5.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Hex Bolts and Nuts M8', sku: 'HEX-BOLTS-AND-NUTS-M8', measurement: 'pack', quantity: 46, price: 8.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Steel Nails 50mm', sku: 'STEEL-NAILS-50MM', measurement: 'kilogram', quantity: 49, price: 4.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Heavy Duty L-Brackets', sku: 'HEAVY-DUTY-L-BRACKETS', measurement: 'piece', quantity: 39, price: 1.80, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Concealed Cabinet Hinges', sku: 'CONCEALED-CABINET-HINGES', measurement: 'pair', quantity: 29, price: 4.20, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Soft Close Drawer Slides', sku: 'SOFT-CLOSE-DRAWER-SLIDES', measurement: 'pair', quantity: 19, price: 11.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Brass Drawer Pulls', sku: 'BRASS-DRAWER-PULLS', measurement: 'piece', quantity: 33, price: 3.75, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Matte Black Handles', sku: 'MATTE-BLACK-HANDLES', measurement: 'piece', quantity: 42, price: 3.20, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'PVA Wood Glue', sku: 'PVA-WOOD-GLUE', measurement: 'liter', quantity: 22, price: 9.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Epoxy Resin', sku: 'EPOXY-RESIN', measurement: 'liter', quantity: 5, price: 28.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Clear Wood Varnish', sku: 'CLEAR-WOOD-VARNISH', measurement: 'liter', quantity: 14.5, price: 16.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Walnut Wood Stain', sku: 'WALNUT-WOOD-STAIN', measurement: 'liter', quantity: 49, price: 14.50, lowStockAlert: 1, maxStockAlert: 99999 },
    { name: 'Matte White Paint', sku: 'MATTE-WHITE-PAINT', measurement: 'liter', quantity: 32, price: 15.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Matte Black Paint', sku: 'MATTE-BLACK-PAINT', measurement: 'liter', quantity: 25.5, price: 15.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Sandpaper Roll 120 Grit', sku: 'SANDPAPER-ROLL-120-GRIT', measurement: 'meter', quantity: 22, price: 2.20, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Felt Furniture Pads', sku: 'FELT-FURNITURE-PADS', measurement: 'pack', quantity: 14, price: 3.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Rubber Caster Wheels', sku: 'RUBBER-CASTER-WHEELS', measurement: 'piece', quantity: 14, price: 4.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Warm White LED Strip Light', sku: 'WARM-WHITE-LED-STRIP-LIGHT', measurement: 'meter', quantity: 26, price: 6.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Power Cord with Switch', sku: 'POWER-CORD-WITH-SWITCH', measurement: 'piece', quantity: 11, price: 4.80, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'E27 Lamp Socket', sku: 'E27-LAMP-SOCKET', measurement: 'piece', quantity: 10, price: 2.10, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Braided Fabric Electrical Wire', sku: 'BRAIDED-FABRIC-ELECTRICAL-WIRE', measurement: 'meter', quantity: 29, price: 3.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Jute Rope 10mm', sku: 'JUTE-ROPE-10MM', measurement: 'meter', quantity: 11, price: 1.50, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Rattan Cane Webbing', sku: 'RATTAN-CANE-WEBBING', measurement: 'meter', quantity: 25.5, price: 26.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Cork Sheet 5mm', sku: 'CORK-SHEET-5MM', measurement: 'square meter', quantity: 27, price: 14.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Mirror Glass Sheet', sku: 'MIRROR-GLASS-SHEET', measurement: 'square meter', quantity: 43, price: 38.00, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Silicone Sealant', sku: 'SILICONE-SEALANT', measurement: 'tube', quantity: 21, price: 5.20, lowStockAlert: 0, maxStockAlert: 99999 },
    { name: 'Cardboard Packaging Box', sku: 'CARDBOARD-PACKAGING-BOX', measurement: 'piece', quantity: 7, price: 2.80, lowStockAlert: 0, maxStockAlert: 99999 },
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
        name: 'Windo',
        sku: 'win-1',
        markupPercent: 0,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Glass', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Black window',
        sku: 'bw-1',
        markupPercent: 150,
        workCost: 10,
        retailRatePercent: 100,
        items: [
            { material: 'Glass', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Minimalist Oak Dining Table',
        sku: 'PRD-01',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Oak Wood Plank', quantity: 12 },
            { material: 'Steel Square Tube 1 inch', quantity: 4 },
            { material: 'Clear Wood Varnish', quantity: 0.5 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Industrial Coffee Table',
        sku: 'PRD-02',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Walnut Wood Plank', quantity: 6 },
            { material: 'Steel Square Tube 1 inch', quantity: 3 },
            { material: 'Wood Screws 35mm', quantity: 0.2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Velvet Accent Armchair',
        sku: 'PRD-03',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Velvet Fabric', quantity: 3 },
            { material: 'High-Density Foam 2 inch', quantity: 1.5 },
            { material: 'Oak Wood Plank', quantity: 4 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Leather Lounge Sofa',
        sku: 'PRD-04',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Full-Grain Leather', quantity: 6 },
            { material: 'High-Density Foam 2 inch', quantity: 4 },
            { material: 'Pine Wood Plank', quantity: 15 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Modern Bookshelf (5-Tier)',
        sku: 'PRD-05',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Birch Plywood Sheet 4x8', quantity: 2 },
            { material: 'Steel Square Tube 1 inch', quantity: 8 },
            { material: 'Matte Black Paint', quantity: 0.5 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Floating Wall Shelf',
        sku: 'PRD-06',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Oak Wood Plank', quantity: 3 },
            { material: 'Heavy Duty L-Brackets', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Bedside Nightstand',
        sku: 'PRD-07',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'MDF Board 4x8', quantity: 1 },
            { material: 'Soft Close Drawer Slides', quantity: 1 },
            { material: 'Brass Drawer Pulls', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Glass Top Office Desk',
        sku: 'PRD-08',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Tempered Glass Panel', quantity: 1.5 },
            { material: 'Aluminum Round Rod', quantity: 6 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Rolling Bar Cart',
        sku: 'PRD-09',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Brass Sheet 2mm', quantity: 0.8 },
            { material: 'Tempered Glass Panel', quantity: 0.8 },
            { material: 'Rubber Caster Wheels', quantity: 4 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Rattan Cabinet',
        sku: 'PRD-10',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Birch Plywood Sheet 4x8', quantity: 1.5 },
            { material: 'Rattan Cane Webbing', quantity: 1.5 },
            { material: 'Concealed Cabinet Hinges', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Marble Side Table',
        sku: 'PRD-11',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Marble Slab', quantity: 0.4 },
            { material: 'Cast Iron Base', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Industrial Tripod Floor Lamp',
        sku: 'PRD-12',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Walnut Wood Plank', quantity: 4 },
            { material: 'E27 Lamp Socket', quantity: 1 },
            { material: 'Power Cord with Switch', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Minimalist Desk Lamp',
        sku: 'PRD-13',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Brass Sheet 2mm', quantity: 0.2 },
            { material: 'Braided Fabric Electrical Wire', quantity: 2 },
            { material: 'E27 Lamp Socket', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Full-Length Wall Mirror',
        sku: 'PRD-14',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Mirror Glass Sheet', quantity: 1.2 },
            { material: 'Oak Wood Plank', quantity: 4 },
            { material: 'PVA Wood Glue', quantity: 0.2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Upholstered Dining Chair',
        sku: 'PRD-15',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Linen Upholstery Fabric', quantity: 1.5 },
            { material: 'High-Density Foam 2 inch', quantity: 0.5 },
            { material: 'Oak Wood Plank', quantity: 3 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Cork Pinboard (Large)',
        sku: 'PRD-16',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Cork Sheet 5mm', quantity: 1 },
            { material: 'Pine Wood Plank', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Decorative Throw Pillow',
        sku: 'PRD-17',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Canvas Fabric', quantity: 0.8 },
            { material: 'Polyester Fiberfill', quantity: 0.5 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'LED Vanity Mirror',
        sku: 'PRD-18',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Mirror Glass Sheet', quantity: 0.8 },
            { material: 'Warm White LED Strip Light', quantity: 3 },
            { material: 'Power Cord with Switch', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Storage Ottoman',
        sku: 'PRD-19',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Faux Leather PU', quantity: 2 },
            { material: 'MDF Board 4x8', quantity: 0.5 },
            { material: 'High-Density Foam 2 inch', quantity: 0.8 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'Pendant Ceiling Light',
        sku: 'PRD-20',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Frosted Acrylic Sheet', quantity: 0.5 },
            { material: 'Braided Fabric Electrical Wire', quantity: 1.5 },
            { material: 'E27 Lamp Socket', quantity: 1 },
        ],
        commissions: [],
        stock: 0,
    },
    {
        name: 'test product',
        sku: 't-001',
        markupPercent: 100,
        workCost: 0,
        retailRatePercent: 100,
        items: [
            { material: 'Glass', quantity: 1 },
            { material: 'Wood', quantity: 2 },
        ],
        commissions: [],
        stock: 0,
    },
];