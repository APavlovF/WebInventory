// src/features/workshop/AddProductTypeModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import {
    overlayStyle,
    modalStyle,
    scrollAreaStyle,
    labelStyle,
    headerLabelStyle,
    inputStyle,
    addBtnStyle,
    removeBtnStyle,
    cancelBtnStyle,
    submitBtnStyle,
} from '../shared/ModalStyles';
import type { Product, Unit, UnitStock } from '../../types/inventory';
import '../shared/modalForm.css';

export interface Commission {
    id?: number;
    name: string;
    rate: number; // Stored as decimal (e.g., 25% -> 0.25)
}

interface AddProductTypeModalProps {
    isOpen: boolean;
    materials: Unit[];                         // Cached units ("materials") from DB
    materialStocks?: UnitStock[];              // Used to show unit price and compute product cost
    availableCommissions?: Commission[];       // Existing commissions from DB
    onClose: () => void;
    onSuccess: (newProduct: Product) => void;
}

interface MaterialRow {
    rowId: string;
    unitId: string;   // '' = nothing selected yet
    quantity: string; // amount of this material needed for ONE product
}

interface CommissionRow {
    rowId: string;
    commissionId?: number;
    name: string;
    percent: string; // Entered in UI as percentage (e.g., "15" -> 0.15)
}

const newMaterialRow = (): MaterialRow => ({
    rowId: crypto.randomUUID(),
    unitId: '',
    quantity: '',
});

const newCommissionRow = (): CommissionRow => ({
    rowId: crypto.randomUUID(),
    name: '',
    percent: '0',
});

const normalize = (s: string) => s.trim().toLowerCase();

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Mirrors C# Product.ApplyRate(decimal currentPrice, decimal rate)
function applyRate(currentPrice: number, rate: number): number {
    if (rate === 0) return currentPrice;
    if (rate < 0) {
        const denom = 1 - Math.abs(rate);
        return denom === 0 ? currentPrice : currentPrice / denom;
    }
    return currentPrice * (1 + rate);
}

export default function AddProductTypeModal({
    isOpen,
    materials,
    materialStocks = [],
    availableCommissions = [],
    onClose,
    onSuccess,
}: AddProductTypeModalProps) {
    const [productName, setProductName] = useState('');
    const [sku, setSku] = useState('');
    const [markupPercent, setMarkupPercent] = useState('0');
    const [retailRatePercent, setRetailRatePercent] = useState('0');
    const [workCost, setWorkCost] = useState('0');
    const [rows, setRows] = useState<MaterialRow[]>([newMaterialRow()]);
    const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Map unit id -> unit price from materialStocks
    const unitPrices = useMemo(() => {
        const map = new Map<number, number>();
        materialStocks.forEach((us) => {
            map.set(us.unit.id, us.price);
        });
        return map;
    }, [materialStocks]);

    // Map lower-case commission name -> existing Commission
    const commissionByName = useMemo(() => {
        const map = new Map<string, Commission>();
        availableCommissions.forEach((c) => {
            map.set(normalize(c.name), c);
        });
        return map;
    }, [availableCommissions]);

    // Live Wholesale & Retail price preview matching C# logic
    const { materialsTotalCost, wholesalePrice, retailPrice } = useMemo(() => {
        const materialsCost = rows.reduce((sum, r) => {
            const unitId = Number(r.unitId);
            const qty = Number(r.quantity);
            if (!unitId || !Number.isFinite(qty) || qty <= 0) return sum;
            const unitPrice = unitPrices.get(unitId) ?? 0;
            return sum + unitPrice * qty;
        }, 0);

        const parsedWorkCost = Number(workCost);
        const safeWorkCost = Number.isFinite(parsedWorkCost) && parsedWorkCost >= 0 ? parsedWorkCost : 0;

        const parsedMarkup = Number(markupPercent);
        const markupMultiplier = Number.isFinite(parsedMarkup) ? 1 + parsedMarkup / 100 : 1;

        let price = (materialsCost + safeWorkCost) * markupMultiplier;

        for (const c of commissionRows) {
            if (c.name.trim() === '') continue;
            const pct = Number(c.percent);
            if (Number.isFinite(pct)) {
                price = applyRate(price, pct / 100);
            }
        }

        const parsedRetail = Number(retailRatePercent);
        const retailMultiplier = Number.isFinite(parsedRetail) ? 1 + parsedRetail / 100 : 1;

        const whole = round(price);
        const retail = round(whole * retailMultiplier);

        return {
            materialsTotalCost: round(materialsCost),
            wholesalePrice: whole,
            retailPrice: retail,
        };
    }, [rows, unitPrices, workCost, markupPercent, commissionRows, retailRatePercent]);

    if (!isOpen) return null;

    const resetForm = () => {
        setProductName('');
        setSku('');
        setMarkupPercent('0');
        setRetailRatePercent('0');
        setWorkCost('0');
        setRows([newMaterialRow()]);
        setCommissionRows([]);
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    // Material row handlers
    const handleAddRow = () => setRows((prev) => [...prev, newMaterialRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (rowId: string, field: 'unitId' | 'quantity', value: string) =>
        setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

    const isTakenByOtherRow = (rowId: string, unitId: number) =>
        rows.some((r) => r.rowId !== rowId && r.unitId === String(unitId));

    // Commission row handlers
    const handleAddCommission = () => setCommissionRows((prev) => [...prev, newCommissionRow()]);

    const handleRemoveCommission = (rowId: string) =>
        setCommissionRows((prev) => prev.filter((r) => r.rowId !== rowId));

    const handleCommissionChange = (rowId: string, field: 'name' | 'percent', value: string) => {
        setCommissionRows((prev) =>
            prev.map((row) => {
                if (row.rowId !== rowId) return row;

                if (field === 'name') {
                    const matched = commissionByName.get(normalize(value));
                    if (matched) {
                        return {
                            ...row,
                            commissionId: matched.id,
                            name: value,
                            percent: String(round(matched.rate * 100)),
                        };
                    }
                    return {
                        ...row,
                        commissionId: undefined,
                        name: value,
                    };
                }

                // If user edits percent on an existing commission, treat it as a new commission entry
                const matched = commissionByName.get(normalize(row.name));
                const parsedRate = Number(value) / 100;
                const stillMatchesExisting =
                    matched && Number.isFinite(parsedRate) && round(matched.rate) === round(parsedRate);

                return {
                    ...row,
                    commissionId: stillMatchesExisting ? matched.id : undefined,
                    percent: value,
                };
            })
        );
    };

    // Validation
    const markupNum = Number(markupPercent);
    const retailNum = Number(retailRatePercent);
    const workCostNum = Number(workCost);

    const isMarkupValid = markupPercent.trim() !== '' && Number.isFinite(markupNum);
    const isRetailValid = retailRatePercent.trim() !== '' && Number.isFinite(retailNum);
    const isWorkCostValid = workCost.trim() !== '' && Number.isFinite(workCostNum) && workCostNum >= 0;

    const areMaterialsValid =
        rows.length > 0 &&
        rows.every((r) => r.unitId !== '' && r.quantity.trim() !== '' && Number(r.quantity) > 0);

    const duplicateCommissionIds = new Set<string>();
    const seenCommissionNames = new Set<string>();
    for (const c of commissionRows) {
        const key = normalize(c.name);
        if (key !== '') {
            if (seenCommissionNames.has(key)) {
                duplicateCommissionIds.add(c.rowId);
            } else {
                seenCommissionNames.add(key);
            }
        }
    }

    const areCommissionsValid = commissionRows.every((c) => {
        const pct = Number(c.percent);
        return (
            c.name.trim().length > 0 &&
            c.percent.trim() !== '' &&
            Number.isFinite(pct) &&
            !duplicateCommissionIds.has(c.rowId)
        );
    });

    const isFormValid =
        productName.trim().length > 0 &&
        sku.trim().length > 0 &&
        isMarkupValid &&
        isRetailValid &&
        isWorkCostValid &&
        areMaterialsValid &&
        areCommissionsValid;

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches C# Product { Name, Sku, Markup, RetailRate, WorkCost, Price, Commissions, Items }
        const payload = {
            name: productName.trim(),
            sku: sku.trim(),
            markup: round(1 + markupNum / 100),
            retailRate: round(1 + retailNum / 100),
            workCost: round(workCostNum),
            price: wholesalePrice,
            commissions: commissionRows.map((c) => ({
                ...(c.commissionId ? { id: c.commissionId } : {}),
                name: c.name.trim(),
                rate: round(Number(c.percent) / 100),
            })),
            items: rows.map((r) => {
                const unit = materials.find((m) => String(m.id) === r.unitId)!;
                return { quantity: Number(r.quantity), unit };
            }),
        };

        try {
            const response = await apiFetch('/api/product/add', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Failed to save product (${response.status})`);
            }

            const savedProduct: Product = await response.json();

            resetForm();
            onSuccess(savedProduct);
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error saving product to database.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div className="modal-form" style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf', textAlign: 'center' }}>
                    Add Product Type
                </h3>

                <form onSubmit={handleSubmit}>
                    {/* Row 1: Product Name + SKU in one line */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Product Name</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="e.g., Wooden Chair"
                                maxLength={1000}
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>SKU</label>
                            <input
                                type="text"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="e.g., CHAIR-OAK-001"
                                maxLength={200}
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Markup (%), Work Cost, Retail Rate (%) */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Markup (%)</label>
                            <input
                                type="number"
                                step="any"
                                value={markupPercent}
                                onChange={(e) => setMarkupPercent(e.target.value)}
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isMarkupValid ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Work Cost</label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={workCost}
                                onChange={(e) => setWorkCost(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isWorkCostValid ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Retail Rate (%)</label>
                            <input
                                type="number"
                                step="any"
                                value={retailRatePercent}
                                onChange={(e) => setRetailRatePercent(e.target.value)}
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isRetailValid ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                }}
                                required
                            />
                        </div>
                    </div>

                    {/* Materials Section */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>Materials (quantity per 1 product)</label>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ ...headerLabelStyle, flex: 2 }}>Material</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Qty</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Unit Price</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        <div style={{ ...scrollAreaStyle, maxHeight: '150px' }}>
                            {rows.map((row) => {
                                const selectedUnitId = Number(row.unitId);
                                const unitPrice = selectedUnitId ? unitPrices.get(selectedUnitId) : undefined;
                                const qty = Number(row.quantity);
                                const rowTotal =
                                    unitPrice !== undefined && Number.isFinite(qty) && qty > 0
                                        ? round(unitPrice * qty)
                                        : null;

                                return (
                                    <div key={row.rowId} style={{ marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <Combobox
                                                value={row.unitId}
                                                onChange={(v) => handleRowChange(row.rowId, 'unitId', v)}
                                                placeholder="-- Select Material --"
                                                style={{ flex: 2 }}
                                                options={materials.map((m) => {
                                                    const price = unitPrices.get(m.id);
                                                    const baseLabel = m.measurement ? `${m.name} (${m.measurement})` : m.name;
                                                    return {
                                                        value: String(m.id),
                                                        label: baseLabel,
                                                        hint: price !== undefined ? `$${price.toFixed(2)}` : undefined,
                                                        disabled: isTakenByOtherRow(row.rowId, m.id),
                                                    };
                                                })}
                                            />

                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={row.quantity}
                                                onChange={(e) => handleRowChange(row.rowId, 'quantity', e.target.value)}
                                                placeholder="Qty"
                                                style={{ ...inputStyle, flex: 1 }}
                                            />

                                            <input
                                                type="text"
                                                readOnly
                                                value={
                                                    row.unitId === ''
                                                        ? ''
                                                        : unitPrice !== undefined
                                                        ? `$${unitPrice.toFixed(2)}`
                                                        : '$0.00'
                                                }
                                                placeholder="Price"
                                                title={
                                                    rowTotal !== null
                                                        ? `Line cost: $${rowTotal.toFixed(2)}`
                                                        : 'Material unit price from stock'
                                                }
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    opacity: 0.75,
                                                    cursor: 'default',
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(row.rowId)}
                                                style={{
                                                    ...removeBtnStyle,
                                                    visibility: rows.length > 1 ? 'visible' : 'hidden',
                                                }}
                                                title="Remove material"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {rowTotal !== null && (
                                            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', paddingLeft: '4px' }}>
                                                Line cost: ${rowTotal.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={handleAddRow}
                                disabled={rows.length >= materials.length}
                                style={{
                                    ...addBtnStyle,
                                    opacity: rows.length >= materials.length ? 0.5 : 1,
                                    cursor: rows.length >= materials.length ? 'not-allowed' : 'pointer',
                                }}
                            >
                                + Add Material
                            </button>

                            <div style={{ color: '#cbd5e1', fontSize: '13px', marginRight: '44px' }}>
                                Materials Cost: <strong style={{ color: '#2dd4bf' }}>${materialsTotalCost.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Wholesale Commissions Section */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>Commissions and Taxes (optional)</label>

                        {commissionRows.length > 0 && (
                            <div style={{ ...scrollAreaStyle, maxHeight: '130px' }}>
                                {commissionRows.map((cRow) => {
                                    const isDuplicate = duplicateCommissionIds.has(cRow.rowId);
                                    const isNew =
                                        cRow.name.trim() !== '' &&
                                        cRow.commissionId === undefined &&
                                        !isDuplicate;

                                    return (
                                        <div key={cRow.rowId} style={{ marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <Combobox
                                                    value={cRow.name}
                                                    onChange={(v) => handleCommissionChange(cRow.rowId, 'name', v)}
                                                    placeholder="Commission name"
                                                    maxLength={200}
                                                    allowCustom
                                                    invalid={isDuplicate}
                                                    style={{ flex: 2 }}
                                                    options={availableCommissions.map((c) => ({
                                                        value: c.name,
                                                        label: c.name,
                                                        hint: `${round(c.rate * 100)}%`,
                                                    }))}
                                                />

                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={cRow.percent}
                                                    onChange={(e) =>
                                                        handleCommissionChange(cRow.rowId, 'percent', e.target.value)
                                                    }
                                                    placeholder="%"
                                                    style={{ ...inputStyle, flex: 1 }}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCommission(cRow.rowId)}
                                                    style={removeBtnStyle}
                                                    title="Remove commission"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {isDuplicate ? (
                                                <div style={{ color: '#f87171', fontSize: '11px', marginTop: '2px' }}>
                                                    Duplicate commission name
                                                </div>
                                            ) : isNew ? (
                                                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                                                    New commission "{cRow.name.trim()}" will be saved
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button type="button" onClick={handleAddCommission} style={addBtnStyle}>
                            + Add Commission
                        </button>
                    </div>

                    {/* Calculated Wholesale & Retail Price Preview */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                            marginBottom: '12px',
                        }}
                    >
                        <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                            Wholesale Price:{' '}
                            <strong style={{ color: '#2dd4bf', fontSize: '16px' }}>
                                ${wholesalePrice.toFixed(2)}
                            </strong>
                        </div>

                        <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                            Retail Price:{' '}
                            <strong style={{ color: '#38bdf8', fontSize: '16px' }}>
                                ${retailPrice.toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    {apiError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                            {apiError}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
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
                            {isSubmitting ? 'Saving...' : 'Save Product Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
