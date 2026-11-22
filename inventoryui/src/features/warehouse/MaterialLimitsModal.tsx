// src/features/warehouse/MaterialLimitsModal.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useI18n } from '../../i18n/useI18n';

// Lower-case and without accents, so "acai" finds "Açaí"
const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface MaterialLimitsModalProps {
    isOpen: boolean;
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

const createLimitRows = (stocks: UnitStock[]): LimitRow[] =>
    stocks.map((stock) => {
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
    });

export default function MaterialLimitsModal({
    isOpen,
    unitStocks,
    onClose,
    onSuccess,
}: MaterialLimitsModalProps) {
    const { t } = useI18n();
    const [rows, setRows] = useState<LimitRow[]>(() => createLimitRows(unitStocks));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);    

    // A new search starts at the top of the list, where the matches are
    useEffect(() => {
        listRef.current?.scrollTo({ top: 0 });
    }, [query]);

    const activeStocks = useMemo(() => (Array.isArray(unitStocks) ? unitStocks : []), [unitStocks]);   

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

    const canSave = isFormValid && hasChanges && !isSubmitting;

    // Search moves the matching materials to the top (nothing is hidden, and typed limits are kept):
    // name starts with the text, then name contains it, then SKU contains it, then everything else
    const q = normalize(query);
    const rankOf = (stock: UnitStock) => {
        if (!q) return 0;
        const name = normalize(stock.unit.name);
        if (name.startsWith(q)) return 0;
        if (name.includes(q)) return 1;
        if (normalize(stock.unit.sku ?? '').includes(q)) return 2;
        return 3;
    };
    const orderedInfos = rowInfos
        .map((info) => ({ info, rank: rankOf(info.row.stock) }))
        .sort((a, b) => a.rank - b.rank); // stable: equal ranks keep their original order
    const matchCount = q ? orderedInfos.filter((x) => x.rank < 3).length : 0;

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (isSubmitting) return;
        setQuery('');
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
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : t('limits.errSaving'));
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
                        <input
                            type="text"
                            value={query}
                            autoFocus
                            autoComplete="off"
                            placeholder={t('limits.search')}
                            aria-label={t('limits.search')}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); // Enter must not save the form
                                } else if (e.key === 'Escape' && query) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setQuery('');
                                }
                            }}
                            style={{ ...inputStyle, marginBottom: '8px' }}
                        />
                        {q && matchCount === 0 && (
                            <div style={{ color: c.textMuted, fontSize: '12px', margin: '0 0 8px 4px' }}>
                                {t('limits.noMatches')}
                            </div>
                        )}

                        <div ref={listRef} style={scrollAreaStyle}>
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

                            {orderedInfos.map(({ info, rank }) => {
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
                                                    backgroundColor: q && rank < 3 ? alpha('accent', 0.15) : alpha('bgApp', 0.5),
                                                    borderColor: q && rank < 3 ? alpha('accent', 0.7) : alpha('accent', 0.4),
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
