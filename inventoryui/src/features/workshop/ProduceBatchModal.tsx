// src/features/workshop/ProduceBatchModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import { overlayStyle, modalStyle, scrollAreaStyle, rowStyle, headerLabelStyle, summaryStyle, inputStyle, addBtnStyle, removeBtnStyle, cancelBtnStyle, submitBtnStyle } from '../shared/ModalStyles';
import type { Product, ProductStock, UnitStock } from '../../types/inventory';
import '../shared/modalForm.css';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';

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
    const { t } = useI18n();
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

    // Problems and subtotals of each row
    const rowInfos = rows.map((row) => {
        const product = productsById.get(row.productId);
        const qty = Number(row.quantity);
        const qtyValid = Number.isInteger(qty) && qty > 0;
        const existing = product ? stockByProductId.get(product.id) || 0 : 0;
        const items = product?.items ?? [];
        const unitWholesale = product ? product.price : 0;
        const unitRetail = product ? round(product.price * (product.retailRate ?? 1)) : 0;

        return {
            row,
            product,
            qtyValid,
            existing,
            unitWholesale,
            unitRetail,
            wholesaleSubtotal: product && qtyValid ? round(unitWholesale * qty) : 0,
            retailSubtotal: product && qtyValid ? round(unitRetail * qty) : 0,
            invalidRecipe: Boolean(product) && items.some((i) => !(i.quantity > 0)),
            exceedsLimit: Boolean(product) && qtyValid && existing + qty > maxStock,
            lacksMaterials:
                Boolean(product) && qtyValid && items.some((i) => insufficientUnitIds.has(i.unit.id)),
        };
    });

    const totalWholesale = round(rowInfos.reduce((sum, r) => sum + r.wholesaleSubtotal, 0));
    const totalRetail = round(rowInfos.reduce((sum, r) => sum + r.retailSubtotal, 0));

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
            const response = await apiFetch('/api/product/batch', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok) {
                throw new Error(t('produce.errFailed', { status: response.status }));
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : t('produce.errRecording'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div className="modal-form" style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: c.accentBright, textAlign: 'center' }}>{t('produce.title')}</h3>

                <form onSubmit={handleSubmit}>
                    {/* Scrollable list: header stays on top, rows scroll under it */}
                    <div style={scrollAreaStyle}>
                        <div style={rowStyle(true)}>
                            <span style={{ ...headerLabelStyle, flex: 3 }}>{t('common.selectProduct')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>{t('common.quantity')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1.4 }}>{t('common.wholesaleRetail')}</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.invalidRecipe
                                ? t('produce.invalidRecipe')
                                : info.exceedsLimit
                                ? t('common.exceedsMax', { stock: info.existing, max: maxStock })
                                : info.lacksMaterials
                                ? t('produce.notEnoughMaterials')
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
                                            options={products.map((p) => {
                                                const inStock = stockByProductId.get(p.id) || 0;
                                                const retail = round(p.price * (p.retailRate ?? 1));
                                                return {
                                                    value: String(p.id),
                                                    label: t('common.inStockMax', { name: p.name, stock: inStock, max: maxStock }),
                                                    hint: `$${p.price.toFixed(2)} / $${retail.toFixed(2)}`,
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
                                                        ? c.danger
                                                        : alpha('accent', 0.4),
                                            }}
                                        />

                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                info.product
                                                    ? `$${info.unitWholesale.toFixed(2)} / $${info.unitRetail.toFixed(2)}`
                                                    : ''
                                            }
                                            placeholder="—"
                                            style={{
                                                ...inputStyle,
                                                flex: 1.4,
                                                opacity: 0.75,
                                                textAlign: 'right',
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{
                                                ...removeBtnStyle,
                                                visibility: rows.length > 1 ? 'visible' : 'hidden',
                                            }}
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

                        <div style={{ color: c.textStrong, fontSize: '15px', fontWeight: 600, marginRight: '46px' }}>
                            {t('common.wholesaleRetailTotal')}{' '}
                            <span style={{ color: c.accentBright }}>${totalWholesale.toFixed(2)}</span>
                            {' / '}
                            <span style={{ color: c.info }}>${totalRetail.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Total materials needed by the whole batch */}
                    {materialTotals.length > 0 && (
                        <div style={summaryStyle}>
                            <div style={{ fontSize: '12px', color: c.textMuted, marginBottom: '8px' }}>
                                {t('produce.materialsNeeded')}
                            </div>
                            {materialTotals.map((m) => (
                                <div
                                    key={m.unitId}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '13px',
                                        padding: '4px 0',
                                        borderBottom: `1px solid ${alpha('textMuted', 0.1)}`,
                                        color: m.isInsufficient ? c.danger : c.textStrong,
                                    }}
                                >
                                    <span>{m.name}</span>
                                    <span>
                                        {t('produce.need')}: <strong>{m.required}</strong> / {t('produce.avail')}:{' '}<strong>{m.available}</strong> {m.measurement}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

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
                            {isSubmitting ? t('produce.producing') : t('produce.title')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
