// src/features/market/BuyMaterialsModal.tsx
import { useState, useMemo, useRef } from 'react';
import type { SyntheticEvent, ChangeEvent } from 'react';
import { apiFetch } from '../../api';
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

interface BuyMaterialsModalProps {
    isOpen: boolean;
    units: Unit[];               // Known materials (offered as suggestions in the combobox)
    materialStocks: UnitStock[]; // Current stock per material
    maxStock: number;            // Max stock limit, applied per material
    onClose: () => void;
    onSuccess: () => void;       // Called after saving (parent refreshes its data)
}

interface BuyRow {
    rowId: string;
    name: string;        // typed or picked from the combobox
    quantity: string;
    price: string;       // price per unit
    measurement: string; // only used when the material is new
}

// Expected shape returned by your C# invoice parser endpoint (matches List<UnitStock>)
interface ParsedInvoiceItem {
    unit?: {
        name?: string;
        measurement?: string;
    };
    name?: string;
    measurement?: string;
    quantity: number;
    price: number;
}

const newRow = (): BuyRow => ({
    rowId: crypto.randomUUID(),
    name: '',
    quantity: '1',
    price: '0',
    measurement: '',
});

const normalize = (s: string) => s.trim().toLowerCase();

// Avoid floating-point noise such as 0.1 + 0.2 = 0.30000000000000004
const round = (n: number) => Math.round(n * 1e6) / 1e6;

// SKU for a brand-new material, generated from its name: "Oak wood" -> "OAK-WOOD"
const makeSku = (name: string) =>
    name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || name.trim().toUpperCase();

const gridRowLayout = {
    display: 'grid',
    gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 36px',
} as const;

export default function BuyMaterialsModal({
    isOpen,
    units,
    materialStocks,
    maxStock,
    onClose,
    onSuccess,
}: BuyMaterialsModalProps) {
    const [rows, setRows] = useState<BuyRow[]>([newRow()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string>('Preparing file...');
    const [apiError, setApiError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Known materials by lower-case name
    const unitByName = useMemo(() => {
        const map = new Map<string, Unit>();
        units.forEach((u) => map.set(normalize(u.name), u));
        return map;
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

    const rowInfos = rows.map((row) => {
        const key = normalize(row.name);
        const unit = unitByName.get(key);
        const isNew = key !== '' && !unit;
        const qty = Number(row.quantity);
        const qtyValid = row.quantity.trim() !== '' && Number.isFinite(qty) && qty > 0;
        const price = Number(row.price);
        const priceValid = row.price.trim() !== '' && Number.isFinite(price) && price >= 0;
        const subtotal = qtyValid && priceValid ? round(qty * price) : 0;
        const existing = unit ? round(stockByUnitId.get(unit.id) || 0) : 0;
        const measurement = unit ? unit.measurement : row.measurement.trim();

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
            duplicate: key !== '' && rows.some((r) => r.rowId !== row.rowId && normalize(r.name) === key),
            exceedsLimit: key !== '' && qtyValid && round(existing + qty) > maxStock,
            missingMeasurement: isNew && measurement === '',
        };
    });

    const totalCost = round(rowInfos.reduce((sum, r) => sum + r.subtotal, 0));

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every(
            (r) =>
                r.key !== '' &&
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
    };

    const handleClose = () => {
        if (isSubmitting || isImporting) return;
        resetForm();
        onClose();
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (rowId: string, field: 'name' | 'quantity' | 'price' | 'measurement', value: string) =>
        setRows((prev) =>
            prev.map((r) => {
                if (r.rowId !== rowId) return r;

                if (field === 'name') {
                    const matchedUnit = unitByName.get(normalize(value));
                    const existingPrice = matchedUnit ? priceByUnitId.get(matchedUnit.id) : undefined;

                    return {
                        ...r,
                        name: value,
                        ...(existingPrice !== undefined ? { price: String(existingPrice) } : {}),
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
        setImportStatus('Connecting to server...');
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
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok || !response.body) {
                throw new Error(`Invoice import failed (${response.status})`);
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
                throw new Error('No materials were found in the uploaded invoice.');
            }

            const importedRows: BuyRow[] = parsedItems.map((item) => {
                const rawName = (item.unit?.name ?? item.name ?? '').trim();
                const matchedUnit = unitByName.get(normalize(rawName));
                const rawMeasurement = (item.unit?.measurement ?? item.measurement ?? '').trim();

                return {
                    rowId: crypto.randomUUID(),
                    name: matchedUnit ? matchedUnit.name : rawName,
                    quantity: String(item.quantity ?? 1),
                    price: String(item.price ?? 0),
                    measurement: matchedUnit ? matchedUnit.measurement : rawMeasurement,
                };
            });

            setRows(importedRows);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setApiError('Invoice import was canceled.');
            } else {
                setApiError(err.message || 'Error parsing invoice.');
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
                    sku: makeSku(r.row.name),
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
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Purchase failed (${response.status})`);
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error saving purchase.');
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
                    width: '900px',
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

                    <h3 style={{ margin: 0, color: '#2dd4bf', textAlign: 'center' }}>
                        Buy Materials
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
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                ...addBtnStyle,
                                marginTop: 0,
                                whiteSpace: 'nowrap',
                                opacity: isImporting || isSubmitting ? 0.6 : 1,
                                cursor: isImporting || isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isImporting ? 'Parsing...' : '📄 Import Invoice'}
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
                            <span style={{ ...headerLabelStyle, width: '100%' }}>Material (pick or type new)</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>Quantity</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>Unit</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>Price / Unit</span>
                            <span style={{ ...headerLabelStyle, width: '100%' }}>Total</span>
                            <span />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.duplicate
                                ? 'This material is already in the list'
                                : info.exceedsLimit
                                    ? `Exceeds max stock limit (in stock: ${info.existing}, max: ${maxStock})`
                                    : info.row.quantity !== '' && !info.qtyValid
                                        ? 'Enter a quantity above 0'
                                        : info.row.price !== '' && !info.priceValid
                                            ? 'Enter a valid price (0 or higher)'
                                            : info.missingMeasurement
                                                ? 'New material: enter its unit of measurement (kg, pcs, ...)'
                                                : null;

                            return (
                                <div key={info.row.rowId} style={{ marginBottom: '8px' }}>
                                    <div
                                        style={{
                                            ...rowStyle(false),
                                            ...gridRowLayout,
                                        }}
                                    >
                                        <Combobox
                                            value={info.row.name}
                                            onChange={(v) => handleRowChange(info.row.rowId, 'name', v)}
                                            placeholder="e.g., Oak Wood"
                                            maxLength={200}
                                            allowCustom
                                            invalid={info.duplicate}
                                            style={{ width: '100%', minWidth: 0 }}
                                            options={units.map((u) => ({
                                                value: u.name,
                                                label: u.name,
                                                hint: u.measurement,
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
                                                borderColor: info.exceedsLimit ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                            }}
                                        />

                                        <input
                                            type="text"
                                            value={info.unit ? info.unit.measurement : info.row.measurement}
                                            readOnly={Boolean(info.unit)}
                                            onChange={(e) =>
                                                handleRowChange(info.row.rowId, 'measurement', e.target.value)
                                            }
                                            placeholder="kg, pcs"
                                            maxLength={50}
                                            style={{ ...inputStyle, opacity: info.unit ? 0.6 : 1 }}
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
                                                        ? '#f87171'
                                                        : 'rgba(20, 184, 166, 0.4)',
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
                                            title="Remove material"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {errorText ? (
                                        <div
                                            style={{
                                                color: '#f87171',
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
                                                color: '#94a3b8',
                                                fontSize: '12px',
                                                marginTop: '4px',
                                                paddingLeft: '4px',
                                            }}
                                        >
                                            New material "{info.row.name.trim()}" will be created
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
                            + Add Material
                        </button>

                        <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600, marginRight: '44px' }}>
                            Total: <span style={{ color: '#2dd4bf' }}>${totalCost.toFixed(2)}</span>
                        </div>
                    </div>

                    {apiError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>{apiError}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={handleClose} style={cancelBtnStyle}>
                            Cancel
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
                            {isSubmitting ? 'Saving...' : 'Buy Materials'}
                        </button>
                    </div>
                </form>

                {/* Invoice Import Progress Window */}
                {isImporting && (
                    <div
                        style={{
                            ...overlayStyle,
                            zIndex: 1100,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                                    border: '3px solid rgba(45, 212, 191, 0.25)',
                                    borderTopColor: '#2dd4bf',
                                    borderRadius: '50%',
                                    animation: 'spin 1.5s linear infinite',
                                }}
                            />

                            <h4 style={{ margin: '0 0 10px', color: '#2dd4bf', fontSize: '16px' }}>
                                Importing Invoice
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
                                        color: '#cbd5e1',
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
                                    borderColor: '#f87171',
                                    color: '#f87171',
                                }}
                            >
                                Cancel
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
