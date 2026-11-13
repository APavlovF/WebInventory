// src/features/market/BuyMaterialsModal.tsx
import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import { overlayStyle, modalStyle, scrollAreaStyle, rowStyle, headerLabelStyle, inputStyle, addBtnStyle, removeBtnStyle, cancelBtnStyle, submitBtnStyle } from '../shared/ModalStyles';
import type { Unit, UnitStock } from '../../types/inventory';

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
    measurement: string; // only used when the material is new
}

const newRow = (): BuyRow => ({ rowId: crypto.randomUUID(), name: '', quantity: '1', measurement: '' });

const normalize = (s: string) => s.trim().toLowerCase();

// Avoid floating-point noise such as 0.1 + 0.2 = 0.30000000000000004
const round = (n: number) => Math.round(n * 1e6) / 1e6;

// SKU for a brand-new material, generated from its name: "Oak wood" -> "OAK-WOOD"
const makeSku = (name: string) =>
    name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || name.trim().toUpperCase();

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
    const [apiError, setApiError] = useState<string | null>(null);

    // Known materials by lower-case name
    const unitByName = useMemo(() => {
        const map = new Map<string, Unit>();
        units.forEach((u) => map.set(normalize(u.name), u));
        return map;
    }, [units]);

    // Current stock per unit id
    const stockByUnitId = useMemo(() => {
        const map = new Map<number, number>();
        materialStocks.forEach((us) => {
            map.set(us.unit.id, (map.get(us.unit.id) || 0) + us.quantity);
        });
        return map;
    }, [materialStocks]);

    const rowInfos = rows.map((row) => {
        const key = normalize(row.name);
        const unit = unitByName.get(key);
        const isNew = key !== '' && !unit;
        const qty = Number(row.quantity);
        const qtyValid = Number.isFinite(qty) && qty > 0;
        const existing = unit ? round(stockByUnitId.get(unit.id) || 0) : 0;
        const measurement = unit ? unit.measurement : row.measurement.trim();

        return {
            row,
            key,
            unit,
            isNew,
            qtyValid,
            existing,
            measurement,
            duplicate: key !== '' && rows.some((r) => r.rowId !== row.rowId && normalize(r.name) === key),
            exceedsLimit: key !== '' && qtyValid && round(existing + qty) > maxStock,
            missingMeasurement: isNew && measurement === '',
        };
    });

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every(
            (r) =>
                r.key !== '' &&
                r.qtyValid &&
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
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);

    const handleRemoveRow = (rowId: string) =>
        setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.rowId !== rowId)));

    const handleRowChange = (rowId: string, field: 'name' | 'quantity' | 'measurement', value: string) =>
        setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# List<UnitStock> { Unit, Quantity }. The server sets the user from the token.
        // An existing material is sent as it is (with its id); a new one has no id.
        const payload = rowInfos.map((r) => ({
            unit:
                r.unit ?? {
                    name: r.row.name.trim(),
                    measurement: r.measurement,
                    sku: makeSku(r.row.name),
                },
            quantity: Number(r.row.quantity),
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
            <div style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf', textAlign: 'center' }}>Buy Materials</h3>

                <form onSubmit={handleSubmit}>
                    <div style={scrollAreaStyle}>
                        <div style={rowStyle(true)}>
                            <span style={{ ...headerLabelStyle, flex: 3 }}>Material (pick or type new)</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Quantity</span>
                            <span style={{ ...headerLabelStyle, flex: 1 }}>Unit</span>
                            <span style={{ width: '36px', flexShrink: 0 }} />
                        </div>

                        {rowInfos.map((info) => {
                            const errorText = info.duplicate
                                ? 'This material is already in the list'
                                : info.exceedsLimit
                                ? `Exceeds max stock limit (in stock: ${info.existing}, max: ${maxStock})`
                                : info.row.quantity !== '' && !info.qtyValid
                                ? 'Enter a number above 0'
                                : info.missingMeasurement
                                ? 'New material: enter its unit of measurement (kg, pcs, ...)'
                                : null;

                            return (
                                <div key={info.row.rowId} style={{ marginBottom: '8px' }}>
                                    <div style={rowStyle(false)}>
                                        <Combobox
                                            value={info.row.name}
                                            onChange={(v) => handleRowChange(info.row.rowId, 'name', v)}
                                            placeholder="e.g., Oak Wood"
                                            maxLength={200}
                                            allowCustom
                                            invalid={info.duplicate}
                                            style={{ flex: 3 }}
                                            options={units.map((u) => ({ value: u.name, label: u.name, hint: u.measurement }))}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={info.row.quantity}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'quantity', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                flex: 1,
                                                borderColor: info.exceedsLimit ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                                            }}
                                        />

                                        <input
                                            type="text"
                                            value={info.unit ? info.unit.measurement : info.row.measurement}
                                            readOnly={Boolean(info.unit)}
                                            onChange={(e) => handleRowChange(info.row.rowId, 'measurement', e.target.value)}
                                            placeholder="kg, pcs"
                                            maxLength={50}
                                            style={{ ...inputStyle, flex: 1, opacity: info.unit ? 0.6 : 1 }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(info.row.rowId)}
                                            style={{ ...removeBtnStyle, visibility: rows.length > 1 ? 'visible' : 'hidden' }}
                                            title="Remove material"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {errorText ? (
                                        <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                            {errorText}
                                        </div>
                                    ) : info.isNew ? (
                                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                                            New material "{info.row.name.trim()}" will be created
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <button type="button" onClick={handleAddRow} style={addBtnStyle}>
                        + Add Material
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
                            {isSubmitting ? 'Saving...' : 'Buy Materials'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
