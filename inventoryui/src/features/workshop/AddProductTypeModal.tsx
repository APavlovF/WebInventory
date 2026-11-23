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
import { c as clr, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/useI18n';
import SpinnerButton from '../shared/SpinnerButton';

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
    products?: Product[];                      // Existing product types, so one of them can be edited
    onClose: () => void;
    onSuccess: (newProduct: Product) => void;
}

// What the server may send for a product: markup, work cost and commissions are needed to edit it
type EditableProduct = Product & { markup?: number; workCost?: number; commissions?: Commission[] };

interface MaterialRow {
    rowId: string;
    unitKey: string;  // getUnitKey() of the selected material, '' = nothing selected yet
    quantity: string; // amount of this material needed for ONE product
}

interface CommissionRow {
    rowId: string;
    commissionId?: number;
    name: string;
    percent: string; // Entered in UI as percentage (e.g., "15" -> 0.15)
}

interface UnitKeyFields {
    sku?: string | null;
    name?: string | null;
    measurement?: string | null;
}

interface ProductKeyFields {
    sku?: string | null;
    name?: string | null;
}

const normalize = (s?: string | null) => (s ?? '').trim().toLowerCase();

// Mirrors C# Unit.GetUniqueKey(): Sku if non-empty, otherwise "Name|Measurement"
function getUnitKey(item: UnitKeyFields): string {
    const sku = normalize(item.sku);
    if (sku) return `sku:${sku}`;

    const name = normalize(item.name);
    if (!name) return '';

    return `nm:${name}|${normalize(item.measurement)}`;
}

// Mirrors C# Product.GetUniqueKey(): Sku if non-empty, otherwise Name
function getProductKey(item: ProductKeyFields): string {
    const sku = normalize(item.sku);
    if (sku) return `sku:${sku}`;

    const name = normalize(item.name);
    if (!name) return '';

    return `nm:${name}`;
}

const newMaterialRow = (): MaterialRow => ({
    rowId: crypto.randomUUID(),
    unitKey: '',
    quantity: '',
});

const newCommissionRow = (): CommissionRow => ({
    rowId: crypto.randomUUID(),
    name: '',
    percent: '0',
});

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
    products = [],
    onClose,
    onSuccess,
}: AddProductTypeModalProps) {
    const { t } = useI18n();
    const [editingId, setEditingId] = useState<number | null>(null); // null = creating a new product type
    const [productName, setProductName] = useState('');
    const [sku, setSku] = useState('');
    const [markupPercent, setMarkupPercent] = useState('0');
    const [retailRatePercent, setRetailRatePercent] = useState('0');
    const [workCost, setWorkCost] = useState('0');
    const [rows, setRows] = useState<MaterialRow[]>([newMaterialRow()]);
    const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Map unit unique key -> unit price from materialStocks
    const unitPrices = useMemo(() => {
        const map = new Map<string, number>();
        materialStocks.forEach((us) => {
            const key = getUnitKey(us.unit);
            if (key) map.set(key, us.price);
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

    // Product types that can be edited (removed ones are not listed)
    const editableProducts = useMemo(
        () => products.filter((p) => !p.isDeleted).sort((a, b) => a.name.localeCompare(b.name)),
        [products]
    );
    const editingProduct = useMemo(
        () => (editingId === null ? undefined : (products.find((p) => p.id === editingId) as EditableProduct | undefined)),
        [products, editingId]
    );

    // Map unique product key -> existing active Product (O(1) collision detection)
    const productByKey = useMemo(() => {
        const map = new Map<string, Product>();
        products.forEach((p) => {
            if (p.isDeleted) return;
            const key = getProductKey(p);
            if (key) map.set(key, p);
        });
        return map;
    }, [products]);

    // The dropdown materials, plus any material of the edited recipe that is no longer in stock
    const { allMaterials, materialByKey } = useMemo(() => {
        const map = new Map<string, Unit>();
        materials.forEach((m) => {
            const key = getUnitKey(m);
            if (key) map.set(key, m);
        });
        editingProduct?.items.forEach((i) => {
            const key = getUnitKey(i.unit);
            if (key && !map.has(key)) map.set(key, i.unit);
        });
        return {
            allMaterials: Array.from(map.values()),
            materialByKey: map,
        };
    }, [materials, editingProduct]);

    // Live Wholesale & Retail price preview matching C# logic
    const { materialsTotalCost, wholesalePrice, retailPrice } = useMemo(() => {
        const materialsCost = rows.reduce((sum, r) => {
            const qty = Number(r.quantity);
            if (!r.unitKey || !Number.isFinite(qty) || qty <= 0) return sum;
            const unitPrice = unitPrices.get(r.unitKey) ?? 0;
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
        setEditingId(null);
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

    // Pick an existing product type to edit: the form is filled from it.
    // Clearing the box goes back to creating a new one.
    const handlePickProduct = (idStr: string) => {
        if (idStr === '') {
            resetForm();
            return;
        }
        const p = editableProducts.find((x) => String(x.id) === idStr) as EditableProduct | undefined;
        if (!p) return;

        setEditingId(p.id);
        setProductName(p.name);
        setSku(p.sku ?? '');
        setMarkupPercent(String(round(((p.markup ?? 1) - 1) * 100)));
        setRetailRatePercent(String(round(((p.retailRate ?? 1) - 1) * 100)));
        setWorkCost(String(p.workCost ?? 0));
        setRows(
            p.items.length > 0
                ? p.items.map((i) => ({
                      rowId: crypto.randomUUID(),
                      unitKey: getUnitKey(i.unit),
                      quantity: String(i.quantity),
                  }))
                : [newMaterialRow()]
        );
        setCommissionRows(
            (p.commissions ?? []).map((cm) => ({
                rowId: crypto.randomUUID(),
                commissionId: cm.id,
                name: cm.name,
                percent: String(round(cm.rate * 100)),
            }))
        );
        setApiError(null);
    };

    // Material row handlers
    const handleAddRow = () => setRows((prev) => [...prev, newMaterialRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (rowId: string, field: 'unitKey' | 'quantity', value: string) =>
        setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

    const isTakenByOtherRow = (rowId: string, unitKey: string) =>
        unitKey !== '' && rows.some((r) => r.rowId !== rowId && r.unitKey === unitKey);

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

    // The server identifies products by GetUniqueKey() (SKU if provided, otherwise Name)
    const candidateKey = getProductKey({ name: productName, sku });
    const conflictingProduct = candidateKey ? productByKey.get(candidateKey) : undefined;
    const keyTaken = conflictingProduct !== undefined && conflictingProduct.id !== editingId;

    // Old products may come without the data that built their price: the fields then start at 0
    const missingPricing =
        editingProduct !== undefined &&
        (editingProduct.markup === undefined || editingProduct.workCost === undefined || editingProduct.commissions === undefined);

    const areMaterialsValid =
        rows.length > 0 &&
        rows.every((r) => r.unitKey !== '' && r.quantity.trim() !== '' && Number(r.quantity) > 0);

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
        !keyTaken &&
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
            ...(editingId !== null ? { id: editingId } : {}),
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
                const unit = materialByKey.get(r.unitKey)!;
                return { quantity: Number(r.quantity), unit };
            }),
        };

        try {
            const response = await apiFetch(editingId === null ? '/api/product/add' : '/api/product/update', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok) {
                throw new Error(t('addType.errFailed', { status: response.status }));
            }

            const savedProduct: Product = await response.json();

            resetForm();
            onSuccess(savedProduct);
            onClose();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : t('addType.errSaving'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div className="modal-form" style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: clr.accentBright, textAlign: 'center' }}>
                    {editingId === null ? t('addType.title') : t('addType.titleEdit')}
                </h3>

                <form onSubmit={handleSubmit}>
                    {/* Pick an existing product type to edit it (hidden while there is none) */}
                    {editableProducts.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <Combobox
                                searchable
                                clearable
                                clearTitle={t('common.clear')}
                                value={editingId === null ? '' : String(editingId)}
                                onChange={handlePickProduct}
                                placeholder={t('addType.editProduct')}
                                options={editableProducts.map((p) => ({ value: String(p.id), label: p.name, hint: p.sku }))}
                            />
                            {missingPricing && (
                                <div style={{ color: clr.warning, fontSize: '12px', marginTop: '6px', paddingLeft: '4px' }}>
                                    {t('addType.missingPricing')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Row 1: Product Name + SKU in one line */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>{t('addType.productName')}</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder={t('addType.placeholderName')}
                                maxLength={1000}
                                style={{
                                    ...inputStyle,
                                    borderColor: keyTaken && sku.trim() === '' ? clr.danger : alpha('accent', 0.4),
                                }}
                                required
                            />
                            {keyTaken && (
                                <div style={{ color: clr.danger, fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                    {t('addType.nameTaken')}
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('common.sku')}</label>
                            <input
                                type="text"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder={t('addType.placeholderSku')}
                                maxLength={200}
                                style={{
                                    ...inputStyle,
                                    borderColor: keyTaken && sku.trim() !== '' ? clr.danger : alpha('accent', 0.4),
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Markup (%), Work Cost, Retail Rate (%) */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('addType.markup')}</label>
                            <input
                                type="number"
                                step="any"
                                value={markupPercent}
                                onChange={(e) => setMarkupPercent(e.target.value)}
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isMarkupValid ? clr.danger : alpha('accent', 0.4),
                                }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('addType.workCost')}</label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={workCost}
                                onChange={(e) => setWorkCost(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isWorkCostValid ? clr.danger : alpha('accent', 0.4),
                                }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('addType.retailRate')}</label>
                            <input
                                type="number"
                                step="any"
                                value={retailRatePercent}
                                onChange={(e) => setRetailRatePercent(e.target.value)}
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !isRetailValid ? clr.danger : alpha('accent', 0.4),
                                }}
                                required
                            />
                        </div>
                    </div>

                    {/* Materials Section */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>{t('addType.materials')}</label>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ ...headerLabelStyle, flex: 2 }}>{t('common.material')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>{t('addType.qty')}</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>{t('addType.unitPrice')}</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        <div style={{ ...scrollAreaStyle, maxHeight: '150px' }}>
                            {rows.map((row) => {
                                const unitPrice = row.unitKey ? unitPrices.get(row.unitKey) : undefined;
                                const qty = Number(row.quantity);
                                const rowTotal =
                                    unitPrice !== undefined && Number.isFinite(qty) && qty > 0
                                        ? round(unitPrice * qty)
                                        : null;

                                return (
                                    <div key={row.rowId} style={{ marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <Combobox
                                                searchable
                                                value={row.unitKey}
                                                onChange={(v) => handleRowChange(row.rowId, 'unitKey', v)}
                                                placeholder={t('addType.selectMaterial')}
                                                style={{ flex: 2 }}
                                                options={allMaterials.map((m) => {
                                                    const uKey = getUnitKey(m);
                                                    const price = unitPrices.get(uKey);
                                                    const baseLabel = m.measurement ? `${m.name} (${m.measurement})` : m.name;
                                                    return {
                                                        value: uKey,
                                                        label: baseLabel,
                                                        hint: [m.sku, price !== undefined ? `$${price.toFixed(2)}` : undefined]
                                                            .filter(Boolean)
                                                            .join(' · '),
                                                        disabled: isTakenByOtherRow(row.rowId, uKey),
                                                    };
                                                })}
                                            />

                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={row.quantity}
                                                onChange={(e) => handleRowChange(row.rowId, 'quantity', e.target.value)}
                                                placeholder={t('addType.qty')}
                                                style={{ ...inputStyle, flex: 1 }}
                                            />

                                            <input
                                                type="text"
                                                readOnly
                                                value={
                                                    row.unitKey === ''
                                                        ? ''
                                                        : unitPrice !== undefined
                                                        ? `$${unitPrice.toFixed(2)}`
                                                        : '$0.00'
                                                }
                                                placeholder={t('common.price')}
                                                title={
                                                    rowTotal !== null
                                                        ? `${t('addType.lineCost')}: $${rowTotal.toFixed(2)}`
                                                        : t('addType.unitPriceTitle')
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
                                                title={t('common.removeMaterial')}
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {rowTotal !== null && (
                                            <div style={{ color: clr.textMuted, fontSize: '11px', marginTop: '2px', paddingLeft: '4px' }}>
                                                {t('addType.lineCost')}: ${rowTotal.toFixed(2)}
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
                                disabled={rows.length >= allMaterials.length}
                                style={{
                                    ...addBtnStyle,
                                    opacity: rows.length >= allMaterials.length ? 0.5 : 1,
                                    cursor: rows.length >= allMaterials.length ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {t('common.addMaterial')}
                            </button>

                            <div style={{ color: clr.textStrong, fontSize: '13px', marginRight: '44px' }}>
                                {t('addType.materialsCost')}: <strong style={{ color: clr.accentBright }}>${materialsTotalCost.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Wholesale Commissions Section */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>{t('addType.commissions')}</label>

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
                                                    searchable
                                                    value={cRow.name}
                                                    onChange={(v) => handleCommissionChange(cRow.rowId, 'name', v)}
                                                    placeholder={t('addType.commissionName')}
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
                                                    title={t('addType.removeCommission')}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {isDuplicate ? (
                                                <div style={{ color: clr.danger, fontSize: '11px', marginTop: '2px' }}>
                                                    {t('addType.duplicateCommission')}
                                                </div>
                                            ) : isNew ? (
                                                <div style={{ color: clr.textMuted, fontSize: '11px', marginTop: '2px' }}>
                                                    {t('addType.newCommission', { name: cRow.name.trim() })}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button type="button" onClick={handleAddCommission} style={addBtnStyle}>
                            {t('addType.addCommission')}
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
                            backgroundColor: alpha('bgApp', 0.6),
                            border: `1px solid ${alpha('accent', 0.3)}`,
                            marginBottom: '12px',
                        }}
                    >
                        <div style={{ color: clr.textStrong, fontSize: '14px' }}>
                            {t('addType.wholesalePrice')}{' '}
                            <strong style={{ color: clr.accentBright, fontSize: '16px' }}>
                                ${wholesalePrice.toFixed(2)}
                            </strong>
                        </div>

                        <div style={{ color: clr.textStrong, fontSize: '14px' }}>
                            {t('addType.retailPrice')}{' '}
                            <strong style={{ color: clr.info, fontSize: '16px' }}>
                                ${retailPrice.toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    {apiError && (
                        <div style={{ color: clr.danger, fontSize: '13px', marginBottom: '12px' }}>
                            {apiError}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                        <button type="button" onClick={handleClose} style={cancelBtnStyle}>
                            {t('common.cancel')}
                        </button>
                        <SpinnerButton
                            type="submit"
                            disabled={!isFormValid}
                            loading={isSubmitting}
                            loadingText={t('common.saving')}
                            style={submitBtnStyle}
                        >
                            {editingId === null ? t('addType.save') : t('addType.saveChanges')}
                        </SpinnerButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
