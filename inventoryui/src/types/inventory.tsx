// src/types/inventory.ts  (mirrors the C# classes)
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
    product: Pick<Product, 'id' | 'name' | 'sku'>; // no items needed here
    quantity: number;
}