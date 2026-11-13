// src/features/workshop/ProduceBatchModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import { overlayStyle, modalStyle, scrollAreaStyle, rowStyle, headerLabelStyle, summaryStyle, inputStyle, addBtnStyle, removeBtnStyle, cancelBtnStyle, submitBtnStyle } from '../shared/modalStyles';
import type { Product, ProductStock, UnitStock } from '../../types/inventory';

interface ProduceBatchModalProps {
    isOpen: boolean;
    products: Product[];           // Product types; each Item = a material (Unit) + quantity needed for ONE product
    productStocks: ProductStock[]; // Existing product stock records (summed per product for current stock)
    materialStocks: UnitStock[];   // Available material stock (UnitStock.Unit + UnitStock.Quantity)
    maxStock: number;              // Max stock limit, applied per product type
    onClose: () => void;
    onSuccess: () => void;         // Called after the batch is saved (parent refreshes its data)
}

interface BatchRow {
    rowId: string;
    productId: string; // '' = nothing selected yet
    quantity: string;
}

const newRow = (): BatchRow => ({ rowId: crypto.randomUUID(), productId: '', quantity: '1' });

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export default function ProduceBatchModal({
    isOpen,
    products,
    productStocks,
    materialStocks,
    maxStock,
    onClose,
    onSuccess,
}: ProduceBatchModalProps) {
    const [rows, setRows] = useState<BatchRow[]>([newRow()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Current stock per product id, summed from existing ProductStock records
    const stockByProductId = useMemo(() => {
        const map = new Map<number, number>();
        productStocks.forEach((ps) => {
            const id = ps.product?.id;
            if (id != null) map.set(id, (map.get(id) || 0) + ps.quantity);
        });
        return map;
    }, [productStocks]);

    // Available stock per unit id (a unit may appear in several UnitStock rows)
    const availableByUnitId = useMemo(() => {
        const map = new Map<number, number>();
        materialStocks.forEach((us) => {
            map.set(us.unit.id, (map.get(us.unit.id) || 0) + us.quantity);
        });
        return map;
    }, [materialStocks]);

    const productsById = useMemo(() => {
        const map = new Map<string, Product>();
        products.forEach((p) => map.set(String(p.id), p));
        return map;
    }, [products]);

    // Materials needed by ALL rows together (rows share the same material stock)
    const materialTotals = useMemo(() => {
        const totals = new Map<number, { name: string; measurement: string; required: number }>();

        rows.forEach((row) => {
            const product = productsById.get(row.productId);
            const qty = Number(row.quantity);
            if (!product || !(qty > 0)) return;

            (product.items ?? []).forEach((item) => {
                const current = totals.get(item.unit.id) ?? {
                    name: item.unit.name,
                    measurement: item.unit.measurement,
                    required: 0,
                };
                current.required += item.quantity * qty;
                totals.set(item.unit.id, current);
            });
        });

        return Array.from(totals.entries()).map(([unitId, t]) => {
            const available = round(availableByUnitId.get(unitId) || 0);
            const required = round(t.required);
            return { unitId, ...t, required, available, isInsufficient: required > available };
        });
    }, [rows, productsById, availableByUnitId]);

    const insufficientUnitIds = new Set(
        materialTotals.filter((m) => m.isInsufficient).map((m) => m.unitId)
    );

    // Problems of each row
    const rowInfos = rows.map((row) => {
        const product = productsById.get(row.productId);
        const qty = Number(row.quantity);
        const qtyValid = Number.isInteger(qty) && qty > 0;
        const existing = product ? stockByProductId.get(product.id) || 0 : 0;
        const items = product?.items ?? [];

        return {
            row,
            product,
            qtyValid,
            existing,
            invalidRecipe: Boolean(product) && items.some((i) => !(i.quantity > 0)),
            exceedsLimit: Boolean(product) && qtyValid && existing + qty > maxStock,
            lacksMaterials:
                Boolean(product) && qtyValid && items.some((i) => insufficientUnitIds.has(i.unit.id)),
        };
    });

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every(
            (r) =>
                r.product && r.qtyValid && !r.invalidRecipe && !r.exceedsLimit && !r.lacksMaterials
        );

    const canAddRow = rows.length < products.length;

    if (!isOpen) return null;

    const resetForm = () => {
        setRows([newRow()]);
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (rowId: string, field: 'productId' | 'quantity', value: string) =>
        setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

    // A product can be chosen only once per batch: disable it in the other rows' dropdowns
    const isTakenByOtherRow = (rowId: string, productId: number) =>
        rows.some((r) => r.rowId !== rowId && r.productId === String(productId));

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# List<ProductStock> { Product, Quantity }. The server sets the user from the token.
        const payload = rowInfos.map((r) => ({
            product: r.product,
            quantity: Number(r.row.quantity),
        }));

        try {
            // Replace with your AddBatch route
            const response = await apiFetch('/api/productstock/add', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Production failed (${response.status})`);
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error recording batch production.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf', textAlign: 'center' }}>Produce Batch</h3>

                <form onSubmit={handleSubmit}>
                    {/* Scrollable list: header stays on top, rows scroll under it */}
                    <div style={scrollAreaStyle}>
                        <div style={rowStyle(true)}>
                            <span style={{ ...headerLabelStyle, flex: 3 }}>Select Product</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Quantity to Produce</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.invalidRecipe
                                ? 'This product has materials without a quantity defined'
                                : info.exceedsLimit
                                ? `Exceeds max stock limit (in stock: ${info.existing}, max: ${maxStock})`
                                : info.lacksMaterials
                                ? 'Not enough materials'
                                : info.row.quantity !== '' && !info.qtyValid
                                ? 'Enter a whole number above 0'
                                : null;

                            return (
                                <div key={info.row.rowId} style={{ marginBottom: '8px' }}>
                                    <div style={rowStyle(false)}>
                                        <Combobox
                                            value={info.row.productId}
                                            onChange={(v) => handleRowChange(info.row.rowId, 'productId', v)}
                                            placeholder="-- Choose Product --"
                                            style={{ flex: 3 }}
                                            options={products.map((p) => {
                                                const inStock = stockByProductId.get(p.id) || 0;
                                                return {
                                                    value: String(p.id),
                                                    label: `${p.name} (In stock: ${inStock} / ${maxStock})`,
                                                    disabled: inStock >= maxStock || isTakenByOtherRow(info.row.rowId, p.id),
                                                };
                                            })}
                                        />

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={info.row.quantity}
                                            onChange={(e) =>
                                                handleRowChange(info.row.rowId, 'quantity', e.target.value)
                                            }
                                            style={{
                                                ...inputStyle,
                                                flex: 1,
                                                borderColor:
                                                    info.exceedsLimit || info.lacksMaterials
                                                        ? '#f87171'
                                                        : 'rgba(20, 184, 166, 0.4)',
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{
                                                ...removeBtnStyle,
                                                visibility: rows.length > 1 ? 'visible' : 'hidden',
                                            }}
                                            title="Remove product"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {errorText && (
                                        <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                            {errorText}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddRow}
                        disabled={!canAddRow}
                        style={{
                            ...addBtnStyle,
                            opacity: canAddRow ? 1 : 0.5,
                            cursor: canAddRow ? 'pointer' : 'not-allowed',
                        }}
                    >
                        + Add Product
                    </button>

                    {/* Total materials needed by the whole batch */}
                    {materialTotals.length > 0 && (
                        <div style={summaryStyle}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                                Materials needed for this batch:
                            </div>
                            {materialTotals.map((m) => (
                                <div
                                    key={m.unitId}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '13px',
                                        padding: '4px 0',
                                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                        color: m.isInsufficient ? '#f87171' : '#e2e8f0',
                                    }}
                                >
                                    <span>{m.name}</span>
                                    <span>
                                        Need: <strong>{m.required}</strong> / Avail:{' '}
                                        <strong>{m.available}</strong> {m.measurement}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {apiError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>{apiError}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={handleClose} style={cancelBtnStyle}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || isSubmitting}
                            style={{
                                ...submitBtnStyle,
                                opacity: !isFormValid || isSubmitting ? 0.5 : 1,
                                cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting ? 'Producing...' : 'Produce Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
