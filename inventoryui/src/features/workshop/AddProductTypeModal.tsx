// src/features/workshop/AddProductTypeModal.tsx
import { useEffect, useState, useMemo } from 'react';
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
    initialProducts?: Product[];
    onClose: () => void;
    onSuccess: (savedProducts: Product[]) => void;
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

interface ProductDraft {
    tabId: string;
    editingId: number | null; // null = creating a new product type
    productName: string;
    sku: string;
    markupPercent: string;
    retailRatePercent: string;
    workCost: string;
    rows: MaterialRow[];
    commissionRows: CommissionRow[];
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

const newProductDraft = (): ProductDraft => ({
    tabId: crypto.randomUUID(),
    editingId: null,
    productName: '',
    sku: '',
    markupPercent: '0',
    retailRatePercent: '0',
    workCost: '0',
    rows: [newMaterialRow()],
    commissionRows: [],
});

const round = (n: number) => Math.round(n * 1e6) / 1e6;

const productToDraft = (p: EditableProduct): ProductDraft => ({
    tabId: crypto.randomUUID(),
    editingId: p.id && p.id > 0 ? p.id : null,
    productName: p.name ?? '',
    sku: p.sku ?? '',
    markupPercent: String(round(((p.markup ?? 1) - 1) * 100)),
    retailRatePercent: String(round(((p.retailRate ?? 1) - 1) * 100)),
    workCost: String(p.workCost ?? 0),
    rows:
        p.items && p.items.length > 0
            ? p.items.map((i) => ({
                  rowId: crypto.randomUUID(),
                  unitKey: getUnitKey(i.unit),
                  quantity: String(i.quantity),
              }))
            : [newMaterialRow()],
    commissionRows: (p.commissions ?? []).map((cm) => ({
        rowId: crypto.randomUUID(),
        commissionId: cm.id,
        name: cm.name,
        percent: String(round(cm.rate * 100)),
    })),
});

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
    initialProducts,
    onClose,
    onSuccess,
}: AddProductTypeModalProps) {
    const { t } = useI18n();
    const [drafts, setDrafts] = useState<ProductDraft[]>(() => [newProductDraft()]);
    const [activeTabId, setActiveTabId] = useState<string>(() => drafts[0].tabId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialProducts && initialProducts.length > 0) {
            const nextDrafts = initialProducts.map((p) => productToDraft(p as EditableProduct));
            const timeoutId = window.setTimeout(() => {
                setDrafts(nextDrafts);
                setActiveTabId(nextDrafts[0].tabId);
                setApiError(null);
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [isOpen, initialProducts]);

    // Ensure activeDraft always resolves to a valid tab
    const activeDraft = useMemo(
        () => drafts.find((d) => d.tabId === activeTabId) ?? drafts[0],
        [drafts, activeTabId]
    );

    // Helper to update only the currently active tab
    const updateActiveDraft = (updater: (prev: ProductDraft) => ProductDraft) => {
        setDrafts((prev) =>
            prev.map((d) => (d.tabId === activeDraft.tabId ? updater(d) : d))
        );
    };

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
        () =>
            activeDraft.editingId === null
                ? undefined
                : (products.find((p) => p.id === activeDraft.editingId) as EditableProduct | undefined),
        [products, activeDraft.editingId]
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

    // Count candidate keys across all open tabs to prevent duplicate tabs
    const tabKeyCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const d of drafts) {
            const k = getProductKey({ name: d.productName, sku: d.sku });
            if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        return counts;
    }, [drafts]);

    // Validate every draft tab so we know which tabs have errors and whether Submit is enabled
    const draftValidations = useMemo(() => {
        return drafts.map((d) => {
            const markupNum = Number(d.markupPercent);
            const retailNum = Number(d.retailRatePercent);
            const workCostNum = Number(d.workCost);

            const isMarkupValid = d.markupPercent.trim() !== '' && Number.isFinite(markupNum);
            const isRetailValid = d.retailRatePercent.trim() !== '' && Number.isFinite(retailNum);
            const isWorkCostValid = d.workCost.trim() !== '' && Number.isFinite(workCostNum) && workCostNum >= 0;

            const candidateKey = getProductKey({ name: d.productName, sku: d.sku });
            const conflictingProduct = candidateKey ? productByKey.get(candidateKey) : undefined;
            const keyTakenInDb = conflictingProduct !== undefined && conflictingProduct.id !== d.editingId;
            const keyDuplicateInTabs = candidateKey !== '' && (tabKeyCounts.get(candidateKey) ?? 0) > 1;
            const keyTaken = keyTakenInDb || keyDuplicateInTabs;

            const areMaterialsValid =
                d.rows.length > 0 &&
                d.rows.every((r) => r.unitKey !== '' && r.quantity.trim() !== '' && Number(r.quantity) > 0);

            const seenCommissionNames = new Set<string>();
            let hasDuplicateCommission = false;
            for (const c of d.commissionRows) {
                const k = normalize(c.name);
                if (k !== '') {
                    if (seenCommissionNames.has(k)) hasDuplicateCommission = true;
                    seenCommissionNames.add(k);
                }
            }

            const areCommissionsValid =
                !hasDuplicateCommission &&
                d.commissionRows.every((c) => {
                    const pct = Number(c.percent);
                    return c.name.trim().length > 0 && c.percent.trim() !== '' && Number.isFinite(pct);
                });

            const isValid =
                d.productName.trim().length > 0 &&
                !keyTaken &&
                isMarkupValid &&
                isRetailValid &&
                isWorkCostValid &&
                areMaterialsValid &&
                areCommissionsValid;

            return {
                tabId: d.tabId,
                isValid,
                keyTaken,
                keyDuplicateInTabs,
                isMarkupValid,
                isRetailValid,
                isWorkCostValid,
            };
        });
    }, [drafts, productByKey, tabKeyCounts]);

    const activeValidation =
        draftValidations.find((v) => v.tabId === activeDraft.tabId) ?? draftValidations[0];

    const isAllValid = drafts.length > 0 && draftValidations.every((v) => v.isValid);

    // The dropdown materials, plus any material of the edited or imported recipe that is no longer in stock
    const { allMaterials, materialByKey } = useMemo(() => {
        const map = new Map<string, Unit>();
        materials.forEach((m) => {
            const key = getUnitKey(m);
            if (key) map.set(key, m);
        });
        // Include materials from any edited product across all open tabs
        for (const d of drafts) {
            if (d.editingId === null) continue;
            const ep = products.find((p) => p.id === d.editingId) as EditableProduct | undefined;
            ep?.items.forEach((i) => {
                const key = getUnitKey(i.unit);
                if (key && !map.has(key)) map.set(key, i.unit);
            });
        }
        // Include materials from imported products if not already present
        initialProducts?.forEach((p) => {
            p.items?.forEach((i) => {
                const key = getUnitKey(i.unit);
                if (key && !map.has(key)) map.set(key, i.unit);
            });
        });
        return {
            allMaterials: Array.from(map.values()),
            materialByKey: map,
        };
    }, [materials, drafts, products, initialProducts]);

    // Helper to compute prices for any draft (used for active preview & submit payload)
    const computeDraftPrices = (d: ProductDraft) => {
        const materialsCost = d.rows.reduce((sum, r) => {
            const qty = Number(r.quantity);
            if (!r.unitKey || !Number.isFinite(qty) || qty <= 0) return sum;
            const unitPrice = unitPrices.get(r.unitKey) ?? 0;
            return sum + unitPrice * qty;
        }, 0);

        const parsedWorkCost = Number(d.workCost);
        const safeWorkCost = Number.isFinite(parsedWorkCost) && parsedWorkCost >= 0 ? parsedWorkCost : 0;

        const parsedMarkup = Number(d.markupPercent);
        const markupMultiplier = Number.isFinite(parsedMarkup) ? 1 + parsedMarkup / 100 : 1;

        let price = (materialsCost + safeWorkCost) * markupMultiplier;

        for (const c of d.commissionRows) {
            if (c.name.trim() === '') continue;
            const pct = Number(c.percent);
            if (Number.isFinite(pct)) {
                price = applyRate(price, pct / 100);
            }
        }

        const parsedRetail = Number(d.retailRatePercent);
        const retailMultiplier = Number.isFinite(parsedRetail) ? 1 + parsedRetail / 100 : 1;

        const whole = round(price);
        const retail = round(whole * retailMultiplier);

        return {
            materialsTotalCost: round(materialsCost),
            wholesalePrice: whole,
            retailPrice: retail,
        };
    };

    const { materialsTotalCost, wholesalePrice, retailPrice } = useMemo(
        () => computeDraftPrices(activeDraft),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeDraft, unitPrices]
    );

    if (!isOpen) return null;

    const resetForm = () => {
        const initial = newProductDraft();
        setDrafts([initial]);
        setActiveTabId(initial.tabId);
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    // Tab management
    const handleAddTab = () => {
        const created = newProductDraft();
        setDrafts((prev) => [...prev, created]);
        setActiveTabId(created.tabId);
        setApiError(null);
    };

    const handleRemoveTab = (tabId: string) => {
        if (drafts.length <= 1) return;
        const idx = drafts.findIndex((d) => d.tabId === tabId);
        const nextDrafts = drafts.filter((d) => d.tabId !== tabId);
        setDrafts(nextDrafts);

        if (activeDraft.tabId === tabId) {
            const fallback = nextDrafts[Math.min(idx, nextDrafts.length - 1)];
            setActiveTabId(fallback.tabId);
        }
    };

    // Pick an existing product type to edit in the active tab
    const handlePickProduct = (idStr: string) => {
        if (idStr === '') {
            updateActiveDraft((d) => ({
                ...newProductDraft(),
                tabId: d.tabId,
            }));
            setApiError(null);
            return;
        }
        const p = editableProducts.find((x) => String(x.id) === idStr) as EditableProduct | undefined;
        if (!p) return;

        updateActiveDraft((d) => ({
            ...d,
            editingId: p.id,
            productName: p.name,
            sku: p.sku ?? '',
            markupPercent: String(round(((p.markup ?? 1) - 1) * 100)),
            retailRatePercent: String(round(((p.retailRate ?? 1) - 1) * 100)),
            workCost: String(p.workCost ?? 0),
            rows:
                p.items.length > 0
                    ? p.items.map((i) => ({
                          rowId: crypto.randomUUID(),
                          unitKey: getUnitKey(i.unit),
                          quantity: String(i.quantity),
                      }))
                    : [newMaterialRow()],
            commissionRows: (p.commissions ?? []).map((cm) => ({
                rowId: crypto.randomUUID(),
                commissionId: cm.id,
                name: cm.name,
                percent: String(round(cm.rate * 100)),
            })),
        }));
        setApiError(null);
    };

    // Material row handlers (for active tab)
    const handleAddRow = () =>
        updateActiveDraft((d) => ({ ...d, rows: [...d.rows, newMaterialRow()] }));

    const handleRemoveRow = (rowId: string) =>
        updateActiveDraft((d) => ({
            ...d,
            rows: d.rows.length === 1 ? d.rows : d.rows.filter((r) => r.rowId !== rowId),
        }));

    const handleRowChange = (rowId: string, field: 'unitKey' | 'quantity', value: string) =>
        updateActiveDraft((d) => ({
            ...d,
            rows: d.rows.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)),
        }));

    const isTakenByOtherRow = (rowId: string, unitKey: string) =>
        unitKey !== '' && activeDraft.rows.some((r) => r.rowId !== rowId && r.unitKey === unitKey);

    // Commission row handlers (for active tab)
    const handleAddCommission = () =>
        updateActiveDraft((d) => ({
            ...d,
            commissionRows: [...d.commissionRows, newCommissionRow()],
        }));

    const handleRemoveCommission = (rowId: string) =>
        updateActiveDraft((d) => ({
            ...d,
            commissionRows: d.commissionRows.filter((r) => r.rowId !== rowId),
        }));

    const handleCommissionChange = (rowId: string, field: 'name' | 'percent', value: string) => {
        updateActiveDraft((d) => ({
            ...d,
            commissionRows: d.commissionRows.map((row) => {
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

                const matched = commissionByName.get(normalize(row.name));
                const parsedRate = Number(value) / 100;
                const stillMatchesExisting =
                    matched && Number.isFinite(parsedRate) && round(matched.rate) === round(parsedRate);

                return {
                    ...row,
                    commissionId: stillMatchesExisting ? matched.id : undefined,
                    percent: value,
                };
            }),
        }));
    };

    // Active tab derived validation flags
    const missingPricing =
        editingProduct !== undefined &&
        (editingProduct.markup === undefined ||
            editingProduct.workCost === undefined ||
            editingProduct.commissions === undefined);

    const duplicateCommissionIds = new Set<string>();
    const seenCommissionNames = new Set<string>();
    for (const c of activeDraft.commissionRows) {
        const key = normalize(c.name);
        if (key !== '') {
            if (seenCommissionNames.has(key)) {
                duplicateCommissionIds.add(c.rowId);
            } else {
                seenCommissionNames.add(key);
            }
        }
    }

    // Build List<Product> payload and send it in a single request
    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isAllValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        const payload = drafts.map((d) => {
            const { wholesalePrice: draftWholesale } = computeDraftPrices(d);
            const markupNum = Number(d.markupPercent);
            const retailNum = Number(d.retailRatePercent);
            const workCostNum = Number(d.workCost);

            return {
                ...(d.editingId !== null ? { id: d.editingId } : {}),
                name: d.productName.trim(),
                sku: d.sku.trim(),
                markup: round(1 + markupNum / 100),
                retailRate: round(1 + retailNum / 100),
                workCost: round(workCostNum),
                price: draftWholesale,
                commissions: d.commissionRows.map((c) => ({
                    ...(c.commissionId ? { id: c.commissionId } : {}),
                    name: c.name.trim(),
                    rate: round(Number(c.percent) / 100),
                })),
                items: d.rows.map((r) => {
                    const unit = materialByKey.get(r.unitKey)!;
                    return { quantity: Number(r.quantity), unit };
                }),
            };
        });

        try {
            // Sends List<Product> in a single POST request
            const response = await apiFetch('/api/product/save', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok) {
                throw new Error(t('addType.errFailed', { status: response.status }));
            }

            const savedProducts: Product[] = await response.json();

            resetForm();
            onSuccess(savedProducts);
            onClose();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : t('addType.errSaving'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Dynamic submit label: "Save Product Type" vs "Save 2 Product Types"
    const submitLabel =
        drafts.length === 1
            ? activeDraft.editingId === null
                ? t('addType.save')
                : t('addType.saveChanges')
            : t('addType.saveMultiple', { count: drafts.length });

    return (
        <div style={overlayStyle}>
            <div className="modal-form" style={modalStyle}>
                <h3 style={{ margin: '0 0 12px 0', color: clr.accentBright, textAlign: 'center' }}>
                    {activeDraft.editingId === null ? t('addType.title') : t('addType.titleEdit')}
                </h3>

                {/* Product Tabs Bar + "+ Add new Product" Button */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '8px',
                        marginBottom: '12px',
                        borderBottom: `1px solid ${alpha('accent', 0.25)}`,
                    }}
                >
                    {drafts.map((d, index) => {
                        const isActive = d.tabId === activeDraft.tabId;
                        const tabValidation = draftValidations[index];
                        const hasError = !tabValidation?.isValid && d.productName.trim() !== '';
                        const tabTitle = d.productName.trim() || `${t('addType.newTab')} #${index + 1}`;

                        return (
                            <div
                                key={d.tabId}
                                onClick={() => setActiveTabId(d.tabId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    maxWidth: '170px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? clr.accentBright : clr.textStrong,
                                    backgroundColor: isActive
                                        ? alpha('accent', 0.2)
                                        : alpha('bgApp', 0.5),
                                    border: `1px solid ${
                                        hasError
                                            ? clr.danger
                                            : isActive
                                            ? clr.accentBright
                                            : alpha('accent', 0.3)
                                    }`,
                                }}
                                title={tabTitle}
                            >
                                <span
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {tabTitle}
                                </span>

                                {drafts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveTab(d.tabId);
                                        }}
                                        title={t('addType.removeTab')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: clr.textMuted,
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            fontSize: '12px',
                                            lineHeight: 1,
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleAddTab}
                        style={{
                            ...addBtnStyle,
                            marginTop: 0,
                            padding: '5px 10px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {t('addType.addTab')}
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Pick an existing product type to edit it (hidden while there is none) */}
                    {editableProducts.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <Combobox
                                searchable
                                clearable
                                clearTitle={t('common.clear')}
                                value={activeDraft.editingId === null ? '' : String(activeDraft.editingId)}
                                onChange={handlePickProduct}
                                placeholder={t('addType.editProduct')}
                                options={editableProducts.map((p) => ({
                                    value: String(p.id),
                                    label: p.name,
                                    hint: p.sku,
                                }))}
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
                                value={activeDraft.productName}
                                onChange={(e) =>
                                    updateActiveDraft((d) => ({ ...d, productName: e.target.value }))
                                }
                                placeholder={t('addType.placeholderName')}
                                maxLength={1000}
                                style={{
                                    ...inputStyle,
                                    borderColor:
                                        activeValidation.keyTaken && activeDraft.sku.trim() === ''
                                            ? clr.danger
                                            : alpha('accent', 0.4),
                                }}
                                required
                            />
                            {activeValidation.keyTaken && (
                                <div style={{ color: clr.danger, fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                    {activeValidation.keyDuplicateInTabs
                                        ? t('addType.duplicateTab')
                                        : t('addType.nameTaken')}
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('common.sku')}</label>
                            <input
                                type="text"
                                value={activeDraft.sku}
                                onChange={(e) =>
                                    updateActiveDraft((d) => ({ ...d, sku: e.target.value }))
                                }
                                placeholder={t('addType.placeholderSku')}
                                maxLength={200}
                                style={{
                                    ...inputStyle,
                                    borderColor:
                                        activeValidation.keyTaken && activeDraft.sku.trim() !== ''
                                            ? clr.danger
                                            : alpha('accent', 0.4),
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
                                value={activeDraft.markupPercent}
                                onChange={(e) =>
                                    updateActiveDraft((d) => ({ ...d, markupPercent: e.target.value }))
                                }
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !activeValidation.isMarkupValid
                                        ? clr.danger
                                        : alpha('accent', 0.4),
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
                                value={activeDraft.workCost}
                                onChange={(e) =>
                                    updateActiveDraft((d) => ({ ...d, workCost: e.target.value }))
                                }
                                placeholder="0.00"
                                style={{
                                    ...inputStyle,
                                    borderColor: !activeValidation.isWorkCostValid
                                        ? clr.danger
                                        : alpha('accent', 0.4),
                                }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('addType.retailRate')}</label>
                            <input
                                type="number"
                                step="any"
                                value={activeDraft.retailRatePercent}
                                onChange={(e) =>
                                    updateActiveDraft((d) => ({ ...d, retailRatePercent: e.target.value }))
                                }
                                placeholder="0"
                                style={{
                                    ...inputStyle,
                                    borderColor: !activeValidation.isRetailValid
                                        ? clr.danger
                                        : alpha('accent', 0.4),
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
                            {activeDraft.rows.map((row) => {
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
                                                    visibility: activeDraft.rows.length > 1 ? 'visible' : 'hidden',
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
                                disabled={activeDraft.rows.length >= allMaterials.length}
                                style={{
                                    ...addBtnStyle,
                                    opacity: activeDraft.rows.length >= allMaterials.length ? 0.5 : 1,
                                    cursor: activeDraft.rows.length >= allMaterials.length ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {t('common.addMaterial')}
                            </button>

                            <div style={{ color: clr.textStrong, fontSize: '13px', marginRight: '44px' }}>
                                {t('addType.materialsCost')}:{' '}
                                <strong style={{ color: clr.accentBright }}>${materialsTotalCost.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Wholesale Commissions Section */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>{t('addType.commissions')}</label>

                        {activeDraft.commissionRows.length > 0 && (
                            <div style={{ ...scrollAreaStyle, maxHeight: '130px' }}>
                                {activeDraft.commissionRows.map((cRow) => {
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
                            disabled={!isAllValid}
                            loading={isSubmitting}
                            loadingText={t('common.saving')}
                            style={submitBtnStyle}
                        >
                            {submitLabel}
                        </SpinnerButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
