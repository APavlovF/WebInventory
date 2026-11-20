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
import { c, alpha } from '../../theme/themes';
import { useI18n } from '../../i18n/I18nContext';

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
        price: 50,
        quantity: 45,
        unit: { id: -1, name: 'Steel Sheets', measurement: 'kg', sku: 'DEMO-STL' },
    },
    {
        id: -2,
        lowStockAlert: 5,
        maxStockAlert: NO_MAX_LIMIT,
        price: 100,
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
    const { t } = useI18n();
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
                throw new Error(t('err.notAuthorized'));
            }

            if (!response.ok) {
                throw new Error(t('limits.errFailed', { status: response.status }));
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setApiError(err?.message || t('limits.errSaving'));
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
                        color: c.accentBright,
                        textAlign: 'center',
                    }}
                >
                    {t('limits.title')}
                </h3>

                {!isAuthenticated && (
                    <div
                        style={{
                            backgroundColor: alpha('warning', 0.12),
                            border: `1px solid ${alpha('warning', 0.4)}`,
                            color: c.warning,
                            fontSize: '12px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            textAlign: 'center',
                        }}
                    >
                        {t('limits.demoBanner')}
                    </div>
                )}

                {activeStocks.length === 0 ? (
                    <div
                        style={{
                            color: c.textMuted,
                            textAlign: 'center',
                            padding: '24px 0',
                        }}
                    >
                        <p style={{ margin: '0 0 20px 0' }}>
                            {t('limits.none')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={cancelBtnStyle}
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={scrollAreaStyle}>
                            <div style={rowStyle(true)}>
                                <span style={{ ...headerLabelStyle, flex: 2.5 }}>
                                    {t('common.material')}
                                </span>
                                <span style={{ ...headerLabelStyle, flex: 1 }}>
                                    {t('limits.min')}
                                </span>
                                <span style={{ ...headerLabelStyle, flex: 1 }}>
                                    {t('limits.max')}
                                </span>
                            </div>

                            {rowInfos.map((info) => {
                                const errorText = !info.minValid
                                    ? t('limits.errMin')
                                    : !info.maxValid
                                        ? t('limits.errMax', { max: NO_MAX_LIMIT })
                                        : info.maxBelowMin
                                            ? t('limits.errMaxBelowMin')
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
                                                    backgroundColor: alpha('bgApp', 0.5),
                                                    cursor: 'default',
                                                }}
                                            >
                                                <span>{info.row.stock.unit.name}</span>
                                                <span
                                                    style={{
                                                        color: c.textMuted,
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
                                                        ? c.danger
                                                        : alpha('accent', 0.4),
                                                }}
                                            />

                                            <input
                                                type="number"
                                                min="1"
                                                max={NO_MAX_LIMIT}
                                                step="1"
                                                placeholder={t('limits.noLimit')}
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
                                                            ? c.danger
                                                            : alpha('accent', 0.4),
                                                }}
                                            />
                                        </div>

                                        {errorText && (
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {apiError && (
                            <div
                                style={{
                                    color: c.danger,
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
                                {t('common.cancel')}
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
                                {isSubmitting ? t('common.saving') : t('limits.save')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
