// src/types/inventory.ts  (mirrors the C# classes)
export const NO_MAX_LIMIT = 2147483647;

export interface BuyRow {
    rowId: string;
    sku: string;
    name: string;
    quantity: string;
    price: string;
    measurement: string;
}

export interface Commission {
    id?: number;  // present for existing DB records, omitted/0 for new ones
    name: string;
    rate: number; // stored as decimal (e.g., 25% -> 0.25)
}

export interface ImportedMaterialItem {
    unit?: {
        sku?: string;
        name?: string;
        measurement?: string;
    };
    sku?: string;
    name?: string;
    measurement?: string;
    quantity: number;
    price: number;
}

// A recipe line of a product: one material (Unit) + how much of it ONE product needs
export interface Item {
    id: number;
    quantity: number;
    unit: Unit;
}

export interface Product {
    id: number;
    isDeleted: boolean;
    name: string;
    price: number;
    retailRate: number;
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

export interface Unit {
    id: number;
    measurement: string;
    name: string;
    sku: string;
}

// Available stock of a material
export interface UnitStock {
    id: number;
    isDeleted: boolean;
    lowStockAlert: number;
    maxStockAlert: number;
    price: number;
    quantity: number;
    unit: Unit;
}

// Reusable payload shape for updating stock limits
export type StockLimitUpdate = Pick<UnitStock, 'lowStockAlert' | 'maxStockAlert'> & {
    unitId: number;
};

// Helper to check if a max limit is actively configured
export const hasMaxStockLimit = (maxStockAlert: number): boolean =>
    maxStockAlert > 0 && maxStockAlert < NO_MAX_LIMIT;