// src/features/market/SellProductsModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import { overlayStyle, modalStyle, scrollAreaStyle, rowStyle, headerLabelStyle, inputStyle, addBtnStyle, removeBtnStyle, cancelBtnStyle, submitBtnStyle } from '../shared/ModalStyles';
import type { Product, ProductStock } from '../../types/inventory';
import '../shared/modalForm.css';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';

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

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export default function SellProductsModal({
    isOpen,
    products,
    productStocks,
    onClose,
    onSuccess,
}: SellProductsModalProps) {
    const { t } = useI18n();
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

        const wholesaleUnitPrice = product ? round(product.price) : 0;
        const retailUnitPrice = product ? round(product.price * (product.retailRate || 1)) : 0;
        const wholesaleRowTotal = product && qtyValid ? round(wholesaleUnitPrice * qty) : 0;
        const retailRowTotal = product && qtyValid ? round(retailUnitPrice * qty) : 0;

        return {
            row,
            product,
            qtyValid,
            inStock,
            wholesaleUnitPrice,
            retailUnitPrice,
            wholesaleRowTotal,
            retailRowTotal,
            exceedsStock: Boolean(product) && qtyValid && qty > inStock,
        };
    });

    const totalWholesale = round(rowInfos.reduce((sum, r) => sum + r.wholesaleRowTotal, 0));
    const totalRetail = round(rowInfos.reduce((sum, r) => sum + r.retailRowTotal, 0));

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
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok) {
                throw new Error(t('sell.errFailed', { status: response.status }));
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err.message || t('sell.errSaving'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div className="modal-form" style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: c.accentBright, textAlign: 'center' }}>{t('sell.title')}</h3>

                <form onSubmit={handleSubmit}>
                    {sellableProducts.length === 0 && (
                        <div style={{ fontSize: '13px', color: c.textMuted, textAlign: 'center', marginBottom: '12px' }}>
                            {t('sell.none')}
                        </div>
                    )}

                    <div style={scrollAreaStyle}>
                        <div style={rowStyle(true)}>
                            <span style={{ ...headerLabelStyle, flex: 3 }}>{t('common.selectProduct')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>{t('common.quantity')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1.5 }}>{t('common.wholesaleRetail')}</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.exceedsStock
                                ? t('sell.notEnough', { stock: info.inStock })
                                : info.row.quantity !== '' && !info.qtyValid
                                ? t('common.wholeNumberAboveZero')
                                : null;

                            return (
                                <div key={info.row.rowId} style={{ marginBottom: '8px' }}>
                                    <div style={rowStyle(false)}>
                                        <Combobox
                                            searchable
                                            value={info.row.productId}
                                            onChange={(v) => handleRowChange(info.row.rowId, 'productId', v)}
                                            placeholder={t('common.chooseProduct')}
                                            style={{ flex: 3 }}
                                            options={sellableProducts.map((p) => {
                                                const wholesale = round(p.price);
                                                const retail = round(p.price * (p.retailRate || 1));
                                                return {
                                                    value: String(p.id),
                                                    label: t('common.inStock', { name: p.name, stock: stockByProductId.get(p.id) || 0 }),
                                                    hint: `$${wholesale.toFixed(2)} / $${retail.toFixed(2)}`,
                                                    disabled: isTakenByOtherRow(info.row.rowId, p.id),
                                                };
                                            })}
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
                                                borderColor: info.exceedsStock ? c.danger : alpha('accent', 0.4),
                                            }}
                                        />

                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                info.product
                                                    ? `$${info.wholesaleRowTotal.toFixed(2)} / $${info.retailRowTotal.toFixed(2)}`
                                                    : '—'
                                            }
                                            title={
                                                info.product
                                                    ? t('sell.unitPrice', { wholesale: `$${info.wholesaleUnitPrice.toFixed(2)}`, retail: `$${info.retailUnitPrice.toFixed(2)}` })
                                                    : undefined
                                            }
                                            style={{
                                                ...inputStyle,
                                                flex: 1.5,
                                                opacity: 0.75,
                                                textAlign: 'center',
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{ ...removeBtnStyle, visibility: rows.length > 1 ? 'visible' : 'hidden' }}
                                            title={t('common.removeProduct')}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {errorText && (
                                        <div style={{ color: c.danger, fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                            {errorText}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
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
                            {t('common.addProduct')}
                        </button>

                        <div style={{ color: c.textStrong, fontSize: '14px', fontWeight: 600, marginRight: '46px' }}>
                            {t('common.wholesaleRetailTotal')}{' '}
                            <span style={{ color: c.accentBright }}>${totalWholesale.toFixed(2)}</span>
                            {' / '}
                            <span style={{ color: c.info }}>${totalRetail.toFixed(2)}</span>
                        </div>
                    </div>

                    {apiError && (
                        <div style={{ color: c.danger, fontSize: '13px', marginTop: '12px' }}>{apiError}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={handleClose} style={cancelBtnStyle}>
                            {t('common.cancel')}
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
                            {isSubmitting ? t('common.saving') : t('sell.title')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
