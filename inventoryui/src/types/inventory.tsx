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
    user?: User;
}

export interface Product {
    id: number;
    name: string;
    sku: string;
    items: Item[];
}

export interface User {
    id: number;
    // add the other User fields you have
}

export interface ProductStock {
    id: number;
    product: Product;
    quantity: number;
    userId: number;
    user?: User;
}
