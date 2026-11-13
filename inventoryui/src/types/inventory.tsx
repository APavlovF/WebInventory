// src/types/inventory.ts  (mirrors the C# classes)
export const NO_MAX_LIMIT = 2147483647;

export interface Unit {
    id: number;
    measurement: string;
    name: string;
    sku: string;
}

// A recipe line of a product: one material (Unit) + how much of it ONE product needs
export interface Item {
    id: number;
    quantity: number;
    unit: Unit;
}

// Available stock of a material
export interface UnitStock {
    id: number;
    lowStockAlert: number;
    maxStockAlert: number;
    quantity: number;
    unit: Unit;
}

export interface Product {
    id: number;
    name: string;
    sku: string;
    items: Item[];
}

export interface ProductStock {
    id: number;
    lowStockAlert: number;
    maxStockAlert: number;
    product: Pick<Product, 'id' | 'name' | 'sku'>; // no items needed here
    quantity: number;
}

// Reusable payload shape for updating stock limits
export type StockLimitUpdate = Pick<UnitStock, 'lowStockAlert' | 'maxStockAlert'> & {
    unitId: number;
};

// Helper to check if a max limit is actively configured
export const hasMaxStockLimit = (maxStockAlert: number): boolean =>
    maxStockAlert > 0 && maxStockAlert < NO_MAX_LIMIT;