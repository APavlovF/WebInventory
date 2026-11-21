// src/features/warehouse/ProductionMapModal.tsx
// The production map: which materials each product needs (quantity for ONE product).
//  - click a material header  -> only the products that use it are listed (the columns stay)
//  - click a product name     -> only the materials of that product are shown (the rows stay)
//  - both can be active together; "Show all" (top-left cell) or the x on a chip clears them
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Product } from '../../types/inventory';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
    isOpen: boolean;
    products: Product[];
    onClose: () => void;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// A translucent tint that can be laid over an opaque background (the sticky first column needs one)
const tint = (name: 'accent' | 'accentBright', a: number) =>
    `linear-gradient(${alpha(name, a)}, ${alpha(name, a)})`;

// A button that looks like the text around it (headers and product names are clickable)
const linkButton: CSSProperties = {
    background: 'none',
    border: 'none',
    margin: 0,
    padding: 0,
    font: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
    cursor: 'pointer',
    textDecoration: 'underline dotted',
    textUnderlineOffset: '3px',
};

export default function ProductionMapModal({
    isOpen,
    products,
    onClose,
}: Props) {
    const { t } = useI18n();
    const [materialFilter, setMaterialFilter] = useState<number | null>(null);
    const [productFilter, setProductFilter] = useState<number | null>(null);

    // Closing the window forgets the filters. This is "resetting state when a prop changes" done while
    // rendering (the pattern React recommends), not in an effect, so it works for every way of closing
    // and does not cause an extra render pass.
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (!isOpen) {
            setMaterialFilter(null);
            setProductFilter(null);
        }
    }

    if (!isOpen) return null;

    const allMaterials = Array.from(
        new Map(
            products
                .flatMap(p => p.items)
                .map(i => [i.unit.id, i.unit])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    // A filter whose material/product no longer exists (data was refreshed) is simply ignored
    const activeMaterial = allMaterials.find(m => m.id === materialFilter);
    const activeProduct = products.find(p => p.id === productFilter);
    const hasFilter = Boolean(activeMaterial || activeProduct);

    // Rows: products that use the chosen material. Columns: materials of the chosen product.
    // A chosen product always stays visible: it was clicked in a row, and that row uses every material it shows.
    const visibleProducts = activeMaterial
        ? products.filter(p => p.items.some(i => i.unit.id === activeMaterial.id))
        : products;
    const visibleMaterials = activeProduct
        ? allMaterials.filter(m => activeProduct.items.some(i => i.unit.id === m.id))
        : allMaterials;

    // Totals follow what is on screen
    const totalByMaterial = new Map<number, number>();
    visibleProducts.forEach(product => {
        product.items.forEach(item => {
            totalByMaterial.set(
                item.unit.id,
                (totalByMaterial.get(item.unit.id) ?? 0) + item.quantity
            );
        });
    });

    const toggleMaterial = (id: number) => setMaterialFilter(prev => (prev === id ? null : id));
    const toggleProduct = (id: number) => setProductFilter(prev => (prev === id ? null : id));
    const showAll = () => {
        setMaterialFilter(null);
        setProductFilter(null);
    };

    const th: CSSProperties = {
        padding: '12px 16px',
        fontSize: '13px',
        fontWeight: 600,
        color: c.textMuted,
        borderBottom: `1px solid ${c.border}`,
        textAlign: 'left',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: c.bgSurface,
    };

    const td: CSSProperties = {
        textAlign: 'left',
        padding: '12px 16px',
        fontSize: '14px',
        color: c.textStrong,
        borderBottom: `1px solid ${alpha('border', 0.6)}`,
    };

    // The product column stays in view when there are many material columns
    const firstColumn: CSSProperties = {
        position: 'sticky',
        left: 0,
        zIndex: 1,
        backgroundColor: c.bgApp,
    };

    const chip = (label: string, onClear: () => void) => (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '240px',
                padding: '2px 4px 2px 10px',
                borderRadius: '9999px',
                border: `1px solid ${alpha('accent', 0.5)}`,
                background: alpha('accent', 0.12),
                color: c.textStrong,
                fontSize: '12px',
            }}
        >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            <button
                type="button"
                onClick={onClear}
                aria-label={t('common.clear')}
                title={t('common.clear')}
                style={{
                    flexShrink: 0,
                    width: '18px',
                    height: '18px',
                    padding: 0,
                    border: 'none',
                    borderRadius: '50%',
                    background: 'transparent',
                    color: c.textMuted,
                    cursor: 'pointer',
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
        </span>
    );

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2000,
                background: c.bgApp,
                fontFamily: 'monospace',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    position: 'relative',
                    height: '32px',
                    paddingLeft: '12px',
                    paddingTop: '10px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, paddingRight: '56px' }}>
                    <h2
                        style={{
                            margin: 0,
                            color: c.accentBright,
                            fontSize: '18px',
                            lineHeight: '32px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t('prodMap.title')}
                    </h2>

                    {/* What is filtered right now; each chip can be cleared on its own */}
                    {activeMaterial && chip(t('prodMap.chipMaterial', { name: activeMaterial.name }), () => setMaterialFilter(null))}
                    {activeProduct && chip(t('prodMap.chipProduct', { name: activeProduct.name }), () => setProductFilter(null))}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: `1px solid ${c.border}`,
                        background: c.bgSurface,
                        color: c.textMuted,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        fontWeight: 'bold',
                    }}
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    paddingTop: '10px',
                }}
            >
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                    }}
                >
                    <thead>
                        <tr>
                            {/* Top-left cell: the title, or the way back to the whole table while a filter is on */}
                            <th style={{ ...th, left: 0, zIndex: 3 }}>
                                {hasFilter ? (
                                    <button
                                        type="button"
                                        onClick={showAll}
                                        title={t('prodMap.showAll')}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            border: `1px solid ${alpha('accent', 0.6)}`,
                                            background: alpha('accent', 0.15),
                                            color: c.accentBright,
                                            fontFamily: 'monospace',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ↺ {t('prodMap.showAll')}
                                    </button>
                                ) : (
                                    t('common.product')
                                )}
                            </th>

                            {visibleMaterials.map(material => {
                                const isActive = material.id === activeMaterial?.id;
                                return (
                                    <th
                                        key={material.id}
                                        style={{
                                            ...th,
                                            color: isActive ? c.accentBright : c.textMuted,
                                            borderBottom: `2px solid ${isActive ? c.accent : c.border}`,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleMaterial(material.id)}
                                            title={isActive ? t('prodMap.showAll') : t('prodMap.hintMaterial')}
                                            style={linkButton}
                                        >
                                            {material.name}
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {visibleProducts.map(product => {
                            const isActiveRow = product.id === activeProduct?.id;
                            return (
                                <tr
                                    key={product.id}
                                    style={{ background: isActiveRow ? alpha('accent', 0.08) : undefined }}
                                >
                                    <td
                                        style={{
                                            ...td,
                                            ...firstColumn,
                                            color: isActiveRow ? c.accentBright : c.textStrong,
                                            backgroundImage: isActiveRow ? tint('accent', 0.08) : undefined,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleProduct(product.id)}
                                            title={isActiveRow ? t('prodMap.showAll') : t('prodMap.hintProduct')}
                                            style={linkButton}
                                        >
                                            {product.name}
                                        </button>
                                    </td>

                                    {visibleMaterials.map(material => {
                                        const item = product.items.find(x => x.unit.id === material.id);
                                        const isActiveColumn = material.id === activeMaterial?.id;

                                        return (
                                            <td
                                                key={material.id}
                                                style={{
                                                    ...td,
                                                    background: isActiveColumn ? alpha('accent', 0.08) : undefined,
                                                }}
                                            >
                                                {item?.quantity ?? ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        <tr
                            style={{
                                fontWeight: 'bold',
                                background: alpha('accentBright', 0.1),
                            }}
                        >
                            <td style={{ ...td, ...firstColumn, backgroundImage: tint('accentBright', 0.1) }}>
                                {t('prodMap.total')}
                            </td>

                            {visibleMaterials.map(material => (
                                <td
                                    key={material.id}
                                    style={td}
                                >
                                    {round(totalByMaterial.get(material.id) ?? 0)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
