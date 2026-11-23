export interface UnitKeyFields {
    sku?: string | null;
    name?: string | null;
    measurement?: string | null;
}

export interface ProductKeyFields {
    sku?: string | null;
    name?: string | null;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

/**
 * Mirrors C# Unit.GetUniqueKey():
 * Uses trimmed SKU if non-empty, otherwise "Name|Measurement".
 * Returns '' if both SKU and Name are blank (e.g., empty form rows).
 */
export function getUnitKey(item: UnitKeyFields): string {
    const sku = norm(item.sku);
    if (sku) return `sku:${sku}`;

    const name = norm(item.name);
    if (!name) return '';

    return `nm:${name}|${norm(item.measurement)}`;
}

/**
 * Mirrors C# Product.GetUniqueKey():
 * Uses trimmed SKU if non-empty, otherwise Name.
 * Returns '' if both SKU and Name are blank.
 */
export function getProductKey(item: ProductKeyFields): string {
    const sku = norm(item.sku);
    if (sku) return `sku:${sku}`;

    const name = norm(item.name);
    if (!name) return '';

    return `nm:${name}`;
}