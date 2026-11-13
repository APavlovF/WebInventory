// src/features/warehouse/MaterialLimitsModal.tsx
import { useState, useEffect } from 'react';
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

import type { Unit } from '../../types/inventory';

import '../shared/modalForm.css';

const INT_MAX_VALUE = 2147483647;

export interface MaterialLimit {
    unitId: number;
    minStock: number;
    maxStock: number;
}

interface MaterialLimitsModalProps {
    isOpen: boolean;
    units: Unit[];
    existingLimits?: MaterialLimit[];
    onClose: () => void;
    onSuccess: () => void;
}

interface LimitRow {
    unit: Unit;
    minStock: string;
    maxStock: string;
}

export default function MaterialLimitsModal({
    isOpen,
    units,
    existingLimits = [],
    onClose,
    onSuccess,
}: MaterialLimitsModalProps) {
    const [rows, setRows] = useState<LimitRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const limitByUnitId = new Map<number, MaterialLimit>();

        existingLimits.forEach((limit) =>
            limitByUnitId.set(limit.unitId, limit)
        );

        setRows(
            units.map((unit) => {
                const existing = limitByUnitId.get(unit.id);

                return {
                    unit,
                    minStock: existing ? String(existing.minStock) : '0',
                    maxStock:
                        existing && existing.maxStock < INT_MAX_VALUE
                            ? String(existing.maxStock)
                            : '',
                };
            })
        );

        setApiError(null);
    }, [isOpen, units, existingLimits]);

    const rowInfos = rows.map((row) => {
        const minVal =
            row.minStock.trim() === ''
                ? NaN
                : Number(row.minStock);

        const minValid =
            Number.isFinite(minVal) &&
            minVal >= 0;

        const hasMax = row.maxStock.trim() !== '';

        const maxVal = hasMax
            ? Number(row.maxStock)
            : INT_MAX_VALUE;

        const maxValid =
            !hasMax ||
            (
                Number.isFinite(maxVal) &&
                maxVal > 0 &&
                maxVal <= INT_MAX_VALUE
            );

        const maxBelowMin =
            minValid &&
            maxValid &&
            hasMax &&
            maxVal < minVal;

        return {
            row,
            minVal,
            maxVal,
            minValid,
            maxValid,
            maxBelowMin,
        };
    });

    const isFormValid =
        rows.length > 0 &&
        rowInfos.every(
            (r) =>
                r.minValid &&
                r.maxValid &&
                !r.maxBelowMin
        );

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (isSubmitting) return;

        setApiError(null);
        onClose();
    };

    const handleFieldChange = (
        unitId: number,
        field: 'minStock' | 'maxStock',
        value: string
    ) => {
        setRows((prev) =>
            prev.map((row) =>
                row.unit.id === unitId
                    ? { ...row, [field]: value }
                    : row
            )
        );
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();

        if (!isFormValid || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        const payload: MaterialLimit[] = rowInfos.map((info) => ({
            unitId: info.row.unit.id,
            minStock: info.minVal,
            maxStock: info.maxVal,
        }));

        try {
            const response = await apiFetch(
                '/api/warehouse/material-limits',
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'You are not authorized. Please sign in again.'
                );
            }

            if (!response.ok) {
                throw new Error(
                    `Failed to save stock limits (${response.status})`
                );
            }

            onSuccess();
            onClose();
        }
        catch (err: any) {
            setApiError(
                err?.message || 'Error saving stock limits.'
            );
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle} >
            <div
                className="modal-form"
                style={modalStyle}
            >
                <h3
                    style={
                        {
                            margin: '0 0 16px 0',
                            color: '#2dd4bf',
                            textAlign: 'center',
                        }
                    }
                >
                    Warehouse Stock Limits
                </h3>

                {
                    units.length === 0 ? (
                        <div
                            style={{
                                color: '#94a3b8',
                                textAlign: 'center',
                                padding: '24px 0',
                            }
                            }
                        >
                            No materials found.Buy materials first
                            to configure stock alerts.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} >
                            <div style={scrollAreaStyle}>
                                <div style={rowStyle(true)}>
                                    <span
                                        style={
                                            {
                                                ...headerLabelStyle,
                                                flex: 2.5,
                                            }
                                        }
                                    >
                                        Material
                                    </span>

                                    < span
                                        style={{
                                            ...headerLabelStyle,
                                            flex: 1,
                                        }
                                        }
                                    >
                                        Min(Alert)
                                    </span>

                                    < span
                                        style={{
                                            ...headerLabelStyle,
                                            flex: 1,
                                        }}
                                    >
                                        Max(Optional)
                                    </span>
                                </div>

                                {
                                    rowInfos.map((info) => {
                                        const errorText =
                                            !info.minValid
                                                ? 'Min stock must be 0 or greater'
                                                : !info.maxValid
                                                    ? `Max stock must be between 1 and ${INT_MAX_VALUE}`
                                                    : info.maxBelowMin
                                                        ? 'Max stock cannot be less than Min stock'
                                                        : null;

                                        return (
                                            <div
                                                key={info.row.unit.id}
                                                style={{
                                                    marginBottom: '8px',
                                                }
                                                }
                                            >
                                                <div
                                                    style={rowStyle(false)}
                                                >
                                                    <div
                                                        style={{
                                                            ...inputStyle,
                                                            flex: 2.5,
                                                            display: 'flex',
                                                            justifyContent:
                                                                'space-between',
                                                            alignItems:
                                                                'center',
                                                            backgroundColor:
                                                                'rgba(15, 23, 42, 0.5)',
                                                            cursor:
                                                                'default',
                                                        }}
                                                    >
                                                        <span>
                                                            {
                                                                info.row
                                                                    .unit
                                                                    .name
                                                            }
                                                        </span>

                                                        < span
                                                            style={{
                                                                color:
                                                                    '#94a3b8',
                                                                fontSize:
                                                                    '12px',
                                                            }}
                                                        >
                                                            {
                                                                info.row
                                                                    .unit
                                                                    .measurement
                                                            }
                                                        </span>
                                                    </div>

                                                    < input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        placeholder="0"
                                                        value={
                                                            info.row
                                                                .minStock
                                                        }
                                                        onChange={(e) =>
                                                            handleFieldChange(
                                                                info.row
                                                                    .unit
                                                                    .id,
                                                                'minStock',
                                                                e.target
                                                                    .value
                                                            )
                                                        }
                                                        style={{
                                                            ...inputStyle,
                                                            flex: 1,
                                                            borderColor:
                                                                !info.minValid
                                                                    ? '#f87171'
                                                                    : 'rgba(20,184,166,0.4)',
                                                        }}
                                                    />

                                                    < input
                                                        type="number"
                                                        min="1"
                                                        max={
                                                            INT_MAX_VALUE
                                                        }
                                                        step="1"
                                                        placeholder="No limit"
                                                        value={
                                                            info.row
                                                                .maxStock
                                                        }
                                                        onChange={(e) =>
                                                            handleFieldChange(
                                                                info.row
                                                                    .unit
                                                                    .id,
                                                                'maxStock',
                                                                e.target
                                                                    .value
                                                            )
                                                        }
                                                        style={{
                                                            ...inputStyle,
                                                            flex: 1,
                                                            borderColor:
                                                                !info.maxValid ||
                                                                    info.maxBelowMin
                                                                    ? '#f87171'
                                                                    : 'rgba(20,184,166,0.4)',
                                                        }}
                                                    />
                                                </div>

                                                {
                                                    errorText && (
                                                        <div
                                                            style={
                                                                {
                                                                    color:
                                                                        '#f87171',
                                                                    fontSize:
                                                                        '12px',
                                                                    marginTop:
                                                                        '4px',
                                                                    paddingLeft:
                                                                        '4px',
                                                                }
                                                            }
                                                        >
                                                            {errorText}
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        );
                                    })}
                            </div>

                            {
                                apiError && (
                                    <div
                                        style={
                                            {
                                                color: '#f87171',
                                                fontSize: '13px',
                                                marginTop: '12px',
                                            }
                                        }
                                    >
                                        {apiError}
                                    </div>
                                )
                            }

                            <div
                                style={
                                    {
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: '10px',
                                        marginTop: '20px',
                                    }
                                }
                            >
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    style={cancelBtnStyle}
                                >
                                    Cancel
                                </button>

                                < button
                                    type="submit"
                                    disabled={
                                        !isFormValid ||
                                        isSubmitting
                                    }
                                    style={{
                                        ...submitBtnStyle,
                                        opacity:
                                            !isFormValid ||
                                                isSubmitting
                                                ? 0.5
                                                : 1,
                                        cursor:
                                            !isFormValid ||
                                                isSubmitting
                                                ? 'not-allowed'
                                                : 'pointer',
                                    }}
                                >
                                    {
                                        isSubmitting
                                            ? 'Saving...'
                                            : 'Save Limits'
                                    }
                                </button>
                            </div>
                        </form>
                    )}
            </div>
        </div>
    );
}