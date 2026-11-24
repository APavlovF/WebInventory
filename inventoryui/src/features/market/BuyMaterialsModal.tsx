// src/features/market/BuyMaterialsModal.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import type { SyntheticEvent, ChangeEvent } from 'react';
import { apiFetch, isDemoMode } from '../../api';
import Combobox from '../shared/Combobox';
import {
    overlayStyle,
    modalStyle,
    scrollAreaStyle,
    rowStyle,
    headerLabelStyle,
    inputStyle,
    addBtnStyle,
    removeBtnStyle,
    cancelBtnStyle,
    submitBtnStyle,
} from '../shared/ModalStyles';
import type { Unit, UnitStock } from '../../types/inventory';
import '../shared/modalForm.css';
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/useI18n';
import { getUnitKey } from '../shared/uniqueKey';

interface BuyMaterialsModalProps {
    isOpen: boolean;
    autoOpenImport?: boolean;
    units: Unit[];               // Known materials (offered as suggestions in the combobox)
    materialStocks: UnitStock[]; // Current stock per material
    maxStock: number;            // Max stock limit, applied per material
    onClose: () => void;
    onSuccess: () => void;       // Called after saving (parent refreshes its data)
}

interface BuyRow {
    rowId: string;
    sku: string;         // unique key when provided
    name: string;        // typed or picked from the combobox
    quantity: string;
    price: string;       // price per unit
    measurement: string; // unit of measurement
}

// Expected shape returned by your C# invoice parser endpoint (matches List<UnitStock>)
interface ParsedInvoiceItem {
    unit?: {
        sku?: string;
        name?: string;
        measurement?: string;
    };
    sku?: string;
    name?: string;
    measurement?: string;
    quantity: number;
    price: number;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

const newRow = (): BuyRow => ({
    rowId: crypto.randomUUID(),
    sku: '',
    name: '',
    quantity: '1',
    price: '0',
    measurement: '',
});

// Avoid floating-point noise such as 0.1 + 0.2 = 0.30000000000000004
const round = (n: number) => Math.round(n * 1e6) / 1e6;

// SKU fallback for a brand-new material when user leaves SKU blank: "Oak wood" -> "OAK-WOOD"
const makeSku = (name: string) =>
    name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || name.trim().toUpperCase();

const gridRowLayout = {
    display: 'grid',
    gridTemplateColumns: '1.3fr 2.5fr 0.9fr 1fr 1fr 1fr 36px',
} as const;

export default function BuyMaterialsModal({
    isOpen,
    autoOpenImport = false,
    units,
    materialStocks,
    maxStock,
    onClose,
    onSuccess,
}: BuyMaterialsModalProps) {
    const { t } = useI18n();
    const [rows, setRows] = useState<BuyRow[]>([newRow()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string>(t('buy.preparing'));
    const [apiError, setApiError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Invoice parsing runs on the server, which demo mode never talks to: explain instead of failing
    const openFilePicker = () => {
        if (isDemoMode()) {
            setNotice(t('buy.importDemoDisabled'));
            return;
        }
        setNotice(null);
        fileInputRef.current?.click();
    };

    useEffect(() => {
        if (isOpen && autoOpenImport) {
            setTimeout(() => {
                openFilePicker();
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, autoOpenImport]);

    // Known materials indexed by unique key (SKU or name|measurement), plus name/sku helpers for autofill
    const { unitByKey, unitsByName, unitBySku } = useMemo(() => {
        const byKey = new Map<string, Unit>();
        const byName = new Map<string, Unit[]>();
        const bySku = new Map<string, Unit>();

        units.forEach((u) => {
            const k = getUnitKey(u);
            if (k) byKey.set(k, u);

            const skuNorm = norm(u.sku);
            if (skuNorm) bySku.set(skuNorm, u);

            const n = norm(u.name);
            if (n) {
                const list = byName.get(n) ?? [];
                list.push(u);
                byName.set(n, list);
            }
        });

        return { unitByKey: byKey, unitsByName: byName, unitBySku: bySku };
    }, [units]);

    // Current stock and last known price per unit id
    const { stockByUnitId, priceByUnitId } = useMemo(() => {
        const stockMap = new Map<number, number>();
        const priceMap = new Map<number, number>();
        materialStocks.forEach((us) => {
            stockMap.set(us.unit.id, (stockMap.get(us.unit.id) || 0) + us.quantity);
            priceMap.set(us.unit.id, us.price);
        });
        return { stockByUnitId: stockMap, priceByUnitId: priceMap };
    }, [materialStocks]);

    // Pre-compute keys for O(n) duplicate detection
    const rowKeys = useMemo(() => rows.map((r) => getUnitKey(r)), [rows]);

    const keyCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const k of rowKeys) {
            if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        return counts;
    }, [rowKeys]);

    const rowInfos = rows.map((row, idx) => {
        const key = rowKeys[idx];
        const unit = key ? unitByKey.get(key) : undefined;
        const nameTrimmed = row.name.trim();
        const isNew = nameTrimmed !== '' && !unit;
        const qty = Number(row.quantity);
        const qtyValid = row.quantity.trim() !== '' && Number.isFinite(qty) && qty > 0;
        const price = Number(row.price);
        const priceValid = row.price.trim() !== '' && Number.isFinite(price) && price >= 0;
        const subtotal = qtyValid && priceValid ? round(qty * price) : 0;
        const existing = unit ? round(stockByUnitId.get(unit.id) || 0) : 0;
        const measurement = row.measurement.trim();

        return {
            row,
            key,
            unit,
            isNew,
            qtyValid,
            priceValid,
            subtotal,
            existing,
            measurement,
            duplicate: key !== '' && (keyCounts.get(key) ?? 0) > 1,
            exceedsLimit: key !== '' && qtyValid && round(existing + qty) > maxStock,
            missingName: key !== '' && nameTrimmed === '',
            missingMeasurement: isNew && measurement === '',
        };
    });

    const totalCost = round(rowInfos.reduce((sum, r) => sum + r.subtotal, 0));

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every(
            (r) =>
                r.key !== '' &&
                !r.missingName &&
                r.qtyValid &&
                r.priceValid &&
                !r.duplicate &&
                !r.exceedsLimit &&
                !r.missingMeasurement
        );

    if (!isOpen) return null;

    const resetForm = () => {
        setRows([newRow()]);
        setApiError(null);
        setNotice(null);
    };

    const handleClose = () => {
        if (isSubmitting || isImporting) return;
        resetForm();
        onClose();
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (
        rowId: string,
        field: 'sku' | 'name' | 'quantity' | 'price' | 'measurement',
        value: string
    ) =>
        setRows((prev) =>
            prev.map((r) => {
                if (r.rowId !== rowId) return r;

                if (field === 'sku') {
                    const matchedBySku = unitBySku.get(norm(value));
                    if (matchedBySku) {
                        const existingPrice = priceByUnitId.get(matchedBySku.id);
                        return {
                            ...r,
                            sku: value,
                            name: matchedBySku.name,
                            measurement: matchedBySku.measurement,
                            ...(existingPrice !== undefined ? { price: String(existingPrice) } : {}),
                        };
                    }
                    return { ...r, sku: value };
                }

                if (field === 'name') {
                    const nameNorm = norm(value);
                    const exactMatch = unitByKey.get(getUnitKey({ name: value, measurement: r.measurement }));
                    const nameMatches = unitsByName.get(nameNorm);
                    const matchedUnit = exactMatch ?? (nameMatches?.length === 1 ? nameMatches[0] : undefined);

                    if (matchedUnit) {
                        const existingPrice = priceByUnitId.get(matchedUnit.id);
                        return {
                            ...r,
                            name: value,
                            sku: matchedUnit.sku ?? '',
                            measurement: matchedUnit.measurement,
                            ...(existingPrice !== undefined ? { price: String(existingPrice) } : {}),
                        };
                    }

                    // User edited the name to something new: clear auto-linked SKU if it belonged to an existing unit
                    const prevUnitBySku = unitBySku.get(norm(r.sku));
                    const shouldClearSku = prevUnitBySku && norm(prevUnitBySku.name) !== nameNorm;

                    return {
                        ...r,
                        name: value,
                        ...(shouldClearSku ? { sku: '' } : {}),
                    };
                }

                if (field === 'measurement') {
                    const matchedUnit = unitByKey.get(getUnitKey({ name: r.name, measurement: value }));

                    if (matchedUnit) {
                        const existingPrice = priceByUnitId.get(matchedUnit.id);
                        return {
                            ...r,
                            measurement: value,
                            sku: matchedUnit.sku ?? '',
                            ...(existingPrice !== undefined ? { price: String(existingPrice) } : {}),
                        };
                    }

                    // User changed measurement (e.g. m2 -> pc): detach auto-linked SKU so it becomes a new material
                    const prevUnitBySku = unitBySku.get(norm(r.sku));
                    const shouldClearSku = prevUnitBySku && norm(prevUnitBySku.measurement) !== norm(value);

                    return {
                        ...r,
                        measurement: value,
                        ...(shouldClearSku ? { sku: '' } : {}),
                    };
                }

                return { ...r, [field]: value };
            })
        );

    const handleCancelImport = () => {
        abortControllerRef.current?.abort();
    };

    const handleInvoiceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset input value so selecting the same file again still triggers onChange
        e.target.value = '';
        if (!file) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsImporting(true);
        setImportStatus(t('buy.connecting'));
        setApiError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Replace with your C# invoice parsing endpoint
            const response = await apiFetch('/api/invoice/parse', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            if (response.status === 401) {
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok || !response.body) {
                throw new Error(t('buy.errImport', { status: response.status }));
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let parsedItems: ParsedInvoiceItem[] | null = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE messages are separated by double newlines
                const events = buffer.split('\n\n');
                buffer = events.pop() ?? '';

                for (const rawEvent of events) {
                    let eventType = 'message';
                    let dataStr = '';

                    for (const line of rawEvent.split('\n')) {
                        if (line.startsWith('event: ')) {
                            eventType = line.slice(7).trim();
                        } else if (line.startsWith('data: ')) {
                            dataStr += line.slice(6);
                        }
                    }

                    if (!dataStr) continue;
                    const payload = JSON.parse(dataStr);

                    if (eventType === 'status') {
                        setImportStatus(payload.message);
                    } else if (eventType === 'error') {
                        throw new Error(payload.message);
                    } else if (eventType === 'result') {
                        parsedItems = payload;
                    }
                }
            }

            if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
                throw new Error(t('buy.errNoItems'));
            }

            const importedRows: BuyRow[] = parsedItems.map((item) => {
                const rawSku = (item.unit?.sku ?? item.sku ?? '').trim();
                const rawName = (item.unit?.name ?? item.name ?? '').trim();
                const rawMeasurement = (item.unit?.measurement ?? item.measurement ?? '').trim();

                const itemKey = getUnitKey({ sku: rawSku, name: rawName, measurement: rawMeasurement });
                const matchedUnit =
                    (itemKey ? unitByKey.get(itemKey) : undefined) ??
                    (unitsByName.get(norm(rawName))?.length === 1 ? unitsByName.get(norm(rawName))![0] : undefined);

                return {
                    rowId: crypto.randomUUID(),
                    sku: matchedUnit?.sku ?? rawSku,
                    name: matchedUnit ? matchedUnit.name : rawName,
                    quantity: String(item.quantity ?? 1),
                    price: String(item.price ?? 0),
                    measurement: matchedUnit ? matchedUnit.measurement : rawMeasurement,
                };
            });

            setRows(importedRows);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                setApiError(t('buy.errCanceled'));
            } else {
                setApiError(err instanceof Error ? err.message : t('buy.errParsing'));
            }
        } finally {
            abortControllerRef.current = null;
            setIsImporting(false);
        }
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting || isImporting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# List<UnitStock> { Unit, Quantity, Price }. The server sets the user from the token.
        // An existing material is sent as it is (with its id); a new one has no id.
        const payload = rowInfos.map((r) => ({
            unit:
                r.unit ?? {
                    name: r.row.name.trim(),
                    measurement: r.measurement,
                    sku: r.row.sku.trim() || makeSku(r.row.name),
                },
            quantity: Number(r.row.quantity),
            price: Number(r.row.price),
        }));

        try {
            // Replace with your AddMaterials route
            const response = await apiFetch('/api/market/materials', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error(t('err.notAuthorized'));
            }
            if (!response.ok) {
                throw new Error(t('buy.errPurchase', { status: response.status }));
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : t('buy.errSaving'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div
                className="modal-form"
                style={{
                    ...modalStyle,
                    width: '1020px',
                    maxWidth: '95vw',
                }}
            >
                {/* Header with Import Invoice Button */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        marginBottom: '16px',
                        gap: '12px',
                    }}
                >
                    <div />

                    <h3 style={{ margin: 0, color: c.accentBright, textAlign: 'center' }}>
                        {t('buy.title')}
                    </h3>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv,.txt"
                            onChange={handleInvoiceUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            disabled={isImporting || isSubmitting}
                            onClick={openFilePicker}
                            style={{
                                ...addBtnStyle,
                                marginTop: 0,
                                whiteSpace: 'nowrap',
                                opacity: isImporting || isSubmitting ? 0.6 : 1,
                                cursor: isImporting || isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isImporting ? t('buy.parsing') : t('buy.import')}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={scrollAreaStyle}>
                        {/* Header Row */}
                        <div
                            style={{
                                ...rowStyle(true),
                                ...gridRowLayout,
                            }}
                        >
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('common.sku')}</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('buy.colMaterial')}</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('common.quantity')}</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('common.unit')}</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('buy.colPriceUnit')}</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>{t('buy.colTotal')}</span>
                            <span />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.duplicate
                                ? t('buy.duplicate')
                                : info.exceedsLimit
                                    ? t('common.exceedsMax', { stock: info.existing, max: maxStock })
                                    : info.missingName
                                        ? t('buy.placeholderName')
                                        : info.row.quantity !== '' && !info.qtyValid
                                            ? t('buy.qtyAboveZero')
                                            : info.row.price !== '' && !info.priceValid
                                                ? t('buy.validPrice')
                                                : info.missingMeasurement
                                                    ? t('buy.needMeasurement')
                                                    : null;

                            return (
                                <div key={info.row.rowId} style={{ marginBottom: '8px' }}>
                                    <div
                                        style={{
                                            ...rowStyle(false),
                                            ...gridRowLayout,
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={info.row.sku}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'sku', e.target.value)}
                                            placeholder={t('common.sku')}
                                            maxLength={100}
                                            style={{
                                                ...inputStyle,
                                                borderColor: info.duplicate ? c.danger : alpha('accent', 0.4),
                                            }}
                                        />

                                        <Combobox
                                            searchable
                                            value={info.row.name}
                                            onChange={(v) => handleRowChange(info.row.rowId, 'name', v)}
                                            placeholder={t('buy.placeholderName')}
                                            maxLength={200}
                                            allowCustom
                                            invalid={info.duplicate || info.missingName}
                                            style={{ width: '100%', minWidth: 0 }}
                                            options={units.map((u) => ({
                                                value: u.name,
                                                label: u.name,
                                                hint: u.sku ? `${u.sku} · ${u.measurement}` : u.measurement,
                                            }))}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={info.row.quantity}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'quantity', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                borderColor: info.exceedsLimit ? c.danger : alpha('accent', 0.4),
                                            }}
                                        />

                                        <input
                                            type="text"
                                            value={info.row.measurement}
                                            onChange={(e) =>
                                                handleRowChange(info.row.rowId, 'measurement', e.target.value)
                                            }
                                            placeholder={t('buy.placeholderMeasurement')}
                                            maxLength={50}
                                            style={inputStyle}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="0.00"
                                            value={info.row.price}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'price', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                borderColor:
                                                    info.row.price !== '' && !info.priceValid
                                                        ? c.danger
                                                        : alpha('accent', 0.4),
                                            }}
                                        />

                                        <input
                                            type="text"
                                            readOnly
                                            value={`$${info.subtotal.toFixed(2)}`}
                                            style={{
                                                ...inputStyle,
                                                opacity: 0.75,
                                                cursor: 'default',
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{
                                                ...removeBtnStyle,
                                                visibility: rows.length > 1 ? 'visible' : 'hidden',
                                            }}
                                            title={t('common.removeMaterial')}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {errorText ? (
                                        <div
                                            style={{
                                                color: c.danger,
                                                fontSize: '12px',
                                                marginTop: '4px',
                                                paddingLeft: '4px',
                                            }}
                                        >
                                            {errorText}
                                        </div>
                                    ) : info.isNew ? (
                                        <div
                                            style={{
                                                color: c.textMuted,
                                                fontSize: '12px',
                                                marginTop: '4px',
                                                paddingLeft: '4px',
                                            }}
                                        >
                                            {t('buy.newMaterial', { name: info.row.name.trim() })}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                        }}
                    >
                        <button type="button" onClick={handleAddRow} style={addBtnStyle}>
                            {t('common.addMaterial')}
                        </button>

                        <div style={{ color: c.textStrong, fontSize: '15px', fontWeight: 600, marginRight: '44px' }}>
                            {t('buy.total')}: <span style={{ color: c.accentBright }}>${totalCost.toFixed(2)}</span>
                        </div>
                    </div>

                    {notice && (
                        <div style={{ color: c.warning, fontSize: '13px', marginTop: '12px' }}>{notice}</div>
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
                            disabled={!isFormValid || isSubmitting || isImporting}
                            style={{
                                ...submitBtnStyle,
                                opacity: !isFormValid || isSubmitting || isImporting ? 0.5 : 1,
                                cursor: !isFormValid || isSubmitting || isImporting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting ? t('common.saving') : t('buy.title')}
                        </button>
                    </div>
                </form>

                {/* Invoice Import Progress Window */}
                {isImporting && (
                    <div
                        style={{
                            ...overlayStyle,
                            zIndex: 1100,
                            backgroundColor: alpha('bgApp', 0.75),
                        }}
                    >
                        <div
                            style={{
                                ...modalStyle,
                                width: '440px',
                                minWidth: '440px',
                                maxWidth: '90vw',
                                boxSizing: 'border-box',
                                textAlign: 'center',
                                padding: '28px 24px',
                            }}
                        >
                            {/* Spinner */}
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    margin: '0 auto 16px',
                                    border: `3px solid ${alpha('accentBright', 0.25)}`,
                                    borderTopColor: c.accentBright,
                                    borderRadius: '50%',
                                    animation: 'spin 1.5s linear infinite',
                                }}
                            />

                            <h4 style={{ margin: '0 0 10px', color: c.accentBright, fontSize: '16px' }}>
                                {t('buy.importing')}
                            </h4>

                            {/* Fixed 2-line height prevents vertical jumping */}
                            <div
                                style={{
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 0 20px',
                                    padding: '0 8px',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: c.textStrong,
                                        fontSize: '14px',
                                        lineHeight: '20px',
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {importStatus}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCancelImport}
                                style={{
                                    ...cancelBtnStyle,
                                    borderColor: c.danger,
                                    color: c.danger,
                                }}
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
