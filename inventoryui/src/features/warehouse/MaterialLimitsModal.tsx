// src/features/warehouse/MaterialLimitsModal.tsx
import { useState, useEffect, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { apiFetch } from '../../api';
import {
    overlayStyle,
    modalStyle,
    scrollAreaStyle,
    rowStyle,
    headerLabelStyle,
    inputStyle,
    cancelBtnStyle,
    submitBtnStyle,
} from '../shared/ModalStyles';
import {
    NO_MAX_LIMIT,
    hasMaxStockLimit,
    type UnitStock,
} from '../../types/inventory';
import '../shared/modalForm.css';

interface MaterialLimitsModalProps {
    isOpen: boolean;
    isAuthenticated: boolean;
    unitStocks: UnitStock[];
    onClose: () => void;
    onSuccess: () => void;
}

interface LimitRow {
    stock: UnitStock;
    lowStockAlert: string;
    maxStockAlert: string;
    initialLow: number;
    initialMax: number;
}

const DEMO_STOCKS: UnitStock[] = [
    {
        id: -1,
        lowStockAlert: 10,
        maxStockAlert: 100,
        quantity: 45,
        unit: { id: -1, name: 'Steel Sheets', measurement: 'kg', sku: 'DEMO-STL' },
    },
    {
        id: -2,
        lowStockAlert: 5,
        maxStockAlert: NO_MAX_LIMIT,
        quantity: 20,
        unit: { id: -2, name: 'Oak Planks', measurement: 'pcs', sku: 'DEMO-OAK' },
    },
];

export default function MaterialLimitsModal({
    isOpen,
    isAuthenticated,
    unitStocks,
    onClose,
    onSuccess,
}: MaterialLimitsModalProps) {
    const [rows, setRows] = useState<LimitRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const activeStocks = useMemo(() => {
        if (!isAuthenticated) {
            return DEMO_STOCKS;
        }
        return Array.isArray(unitStocks) ? unitStocks : [];
    }, [isAuthenticated, unitStocks]);

    useEffect(() => {
        if (!isOpen) return;

        setRows(
            activeStocks.map((stock) => {
                const rawLow = stock.lowStockAlert ?? 0;
                const rawMax = stock.maxStockAlert ?? NO_MAX_LIMIT;
                const normalizedMax = hasMaxStockLimit(rawMax) ? rawMax : NO_MAX_LIMIT;

                return {
                    stock,
                    lowStockAlert: String(rawLow),
                    maxStockAlert: normalizedMax < NO_MAX_LIMIT ? String(normalizedMax) : '',
                    initialLow: rawLow,
                    initialMax: normalizedMax,
                };
            })
        );

        setApiError(null);
    }, [isOpen, activeStocks]);

    const rowInfos = rows.map((row) => {
        const minVal =
            row.lowStockAlert.trim() === '' ? NaN : Number(row.lowStockAlert);
        const minValid = Number.isFinite(minVal) && minVal >= 0;

        const hasMax = row.maxStockAlert.trim() !== '';
        const maxVal = hasMax ? Number(row.maxStockAlert) : NO_MAX_LIMIT;
        const maxValid =
            !hasMax ||
            (Number.isInteger(maxVal) && maxVal > 0 && maxVal <= NO_MAX_LIMIT);

        const maxBelowMin = minValid && maxValid && hasMax && maxVal < minVal;

        const isChanged =
            minValid &&
            maxValid &&
            (minVal !== row.initialLow || maxVal !== row.initialMax);

        return {
            row,
            minVal,
            maxVal,
            minValid,
            maxValid,
            maxBelowMin,
            isChanged,
        };
    });

    const hasChanges = rowInfos.some((r) => r.isChanged);

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every((r) => r.minValid && r.maxValid && !r.maxBelowMin);

    const canSave = isAuthenticated && isFormValid && hasChanges && !isSubmitting;

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (isSubmitting) return;
        setApiError(null);
        onClose();
    };

    const handleFieldChange = (
        stockId: number,
        field: 'lowStockAlert' | 'maxStockAlert',
        value: string
    ) => {
        setRows((prev) =>
            prev.map((row) =>
                row.stock.id === stockId ? { ...row, [field]: value } : row
            )
        );
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!canSave) return;

        setIsSubmitting(true);
        setApiError(null);

        const payload: UnitStock[] = rowInfos.map((info) => ({
            ...info.row.stock,
            lowStockAlert: info.minVal,
            maxStockAlert: info.maxVal,
        }));

        try {
            const response = await apiFetch('/api/materials/limit', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }

            if (!response.ok) {
                throw new Error(`Failed to save stock limits (${response.status})`);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err?.message || 'Error saving stock limits.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={handleClose}>
            <div
                className="modal-form"
                style={modalStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    style={{
                        margin: '0 0 16px 0',
                        color: '#2dd4bf',
                        textAlign: 'center',
                    }}
                >
                    Warehouse Stock Limits
                </h3>

                {!isAuthenticated && (
                    <div
                        style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '12px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            textAlign: 'center',
                        }}
                    >
                        Demo Mode: Preview only. Sign in to save stock limits.
                    </div>
                )}

                {activeStocks.length === 0 ? (
                    <div
                        style={{
                            color: '#94a3b8',
                            textAlign: 'center',
                            padding: '24px 0',
                        }}
                    >
                        <p style={{ margin: '0 0 20px 0' }}>
                            No materials found. Buy materials first to configure stock alerts.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={cancelBtnStyle}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={scrollAreaStyle}>
                            <div style={rowStyle(true)}>
                                <span style={{ ...headerLabelStyle, flex: 2.5 }}>
                                    Material
                                </span>
                                <span style={{ ...headerLabelStyle, flex: 1 }}>
                                    Min (Alert)
                                </span>
                                <span style={{ ...headerLabelStyle, flex: 1 }}>
                                    Max (Optional)
                                </span>
                            </div>

                            {rowInfos.map((info) => {
                                const errorText = !info.minValid
                                    ? 'Min stock must be 0 or greater'
                                    : !info.maxValid
                                        ? `Max stock must be a whole number between 1 and ${NO_MAX_LIMIT}`
                                        : info.maxBelowMin
                                            ? 'Max stock cannot be less than Min stock'
                                            : null;

                                return (
                                    <div
                                        key={info.row.stock.id}
                                        style={{ marginBottom: '8px' }}
                                    >
                                        <div style={rowStyle(false)}>
                                            <div
                                                style={{
                                                    ...inputStyle,
                                                    flex: 2.5,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                                    cursor: 'default',
                                                }}
                                            >
                                                <span>{info.row.stock.unit.name}</span>
                                                <span
                                                    style={{
                                                        color: '#94a3b8',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    {info.row.stock.unit.measurement}
                                                </span>
                                            </div>

                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="0"
                                                value={info.row.lowStockAlert}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        info.row.stock.id,
                                                        'lowStockAlert',
                                                        e.target.value
                                                    )
                                                }
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    borderColor: !info.minValid
                                                        ? '#f87171'
                                                        : 'rgba(20,184,166,0.4)',
                                                }}
                                            />

                                            <input
                                                type="number"
                                                min="1"
                                                max={NO_MAX_LIMIT}
                                                step="1"
                                                placeholder="No limit"
                                                value={info.row.maxStockAlert}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        info.row.stock.id,
                                                        'maxStockAlert',
                                                        e.target.value
                                                    )
                                                }
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    borderColor:
                                                        !info.maxValid || info.maxBelowMin
                                                            ? '#f87171'
                                                            : 'rgba(20,184,166,0.4)',
                                                }}
                                            />
                                        </div>

                                        {errorText && (
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {apiError && (
                            <div
                                style={{
                                    color: '#f87171',
                                    fontSize: '13px',
                                    marginTop: '12px',
                                }}
                            >
                                {apiError}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                marginTop: '20px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                style={cancelBtnStyle}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={!canSave}
                                style={{
                                    ...submitBtnStyle,
                                    opacity: canSave ? 1 : 0.5,
                                    cursor: canSave ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Limits'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
