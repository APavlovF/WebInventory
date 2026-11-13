// src/features/market/SellProductsModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import { overlayStyle, modalStyle, scrollAreaStyle, rowStyle, headerLabelStyle, inputStyle, addBtnStyle, removeBtnStyle, cancelBtnStyle, submitBtnStyle } from '../shared/ModalStyles';
import type { Product, ProductStock } from '../../types/inventory';

interface SellProductsModalProps {
    isOpen: boolean;
    products: Product[];           // Product types
    productStocks: ProductStock[]; // Existing product stock (summed per product)
    onClose: () => void;
    onSuccess: () => void;         // Called after saving (parent refreshes its data)
}

interface SellRow {
    rowId: string;
    productId: string; // '' = nothing selected yet
    quantity: string;
}

const newRow = (): SellRow => ({ rowId: crypto.randomUUID(), productId: '', quantity: '1' });

export default function SellProductsModal({
    isOpen,
    products,
    productStocks,
    onClose,
    onSuccess,
}: SellProductsModalProps) {
    const [rows, setRows] = useState<SellRow[]>([newRow()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Current stock per product id
    const stockByProductId = useMemo(() => {
        const map = new Map<number, number>();
        productStocks.forEach((ps) => {
            const id = ps.product?.id;
            if (id != null) map.set(id, (map.get(id) || 0) + ps.quantity);
        });
        return map;
    }, [productStocks]);

    // Only products that are actually in stock can be sold
    const sellableProducts = useMemo(
        () => products.filter((p) => (stockByProductId.get(p.id) || 0) > 0),
        [products, stockByProductId]
    );

    const rowInfos = rows.map((row) => {
        const product = sellableProducts.find((p) => String(p.id) === row.productId);
        const qty = Number(row.quantity);
        const qtyValid = Number.isInteger(qty) && qty > 0;
        const inStock = product ? stockByProductId.get(product.id) || 0 : 0;

        return { row, product, qtyValid, inStock, exceedsStock: Boolean(product) && qtyValid && qty > inStock };
    });

    const isFormValid =
        rows.length > 0 && rowInfos.every((r) => r.product && r.qtyValid && !r.exceedsStock);

    const canAddRow = rows.length < sellableProducts.length;

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

    // A product can be chosen only once per sale
    const isTakenByOtherRow = (rowId: string, productId: number) =>
        rows.some((r) => r.rowId !== rowId && r.productId === String(productId));

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# List<ProductStock> { Product, Quantity }
        const payload = rowInfos.map((r) => ({
            product: r.product,
            quantity: Number(r.row.quantity),
        }));

        try {
            // Replace with your SellProducts route
            const response = await apiFetch('/api/market/sell', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Sale failed (${response.status})`);
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error saving sale.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf', textAlign: 'center' }}>Sell Products</h3>

                <form onSubmit={handleSubmit}>
                    {sellableProducts.length === 0 && (
                        <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '12px' }}>
                            No products in stock to sell.
                        </div>
                    )}

                    <div style={scrollAreaStyle}>
                        <div style={rowStyle(true)}>
                            <span style={{ ...headerLabelStyle, flex: 3 }}>Select Product</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Quantity to Sell</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.exceedsStock
                                ? `Not enough in stock (in stock: ${info.inStock})`
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
                                            options={sellableProducts.map((p) => ({
                                                value: String(p.id),
                                                label: `${p.name} (In stock: ${stockByProductId.get(p.id) || 0})`,
                                                disabled: isTakenByOtherRow(info.row.rowId, p.id),
                                            }))}
                                        />

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={info.row.quantity}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'quantity', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                flex: 1,
                                                borderColor: info.exceedsStock ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{ ...removeBtnStyle, visibility: rows.length > 1 ? 'visible' : 'hidden' }}
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
                            {isSubmitting ? 'Saving...' : 'Sell Products'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
