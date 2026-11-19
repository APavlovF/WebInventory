// src/features/office/RemoveMaterialModal.tsx

import { useMemo, useState } from 'react';
import { apiFetch } from '../../api';
import Combobox from '../shared/Combobox';
import {
    overlayStyle,
    modalStyle,
    scrollAreaStyle,
    addBtnStyle,
    removeBtnStyle,
    cancelBtnStyle,
    submitBtnStyle,
} from '../shared/ModalStyles';
import type { UnitStock } from '../../types/inventory';

interface RemoveMaterialModalProps {
    isOpen: boolean;
    materialStocks: UnitStock[];
    onClose: () => void;
    onSuccess: () => void;
}

interface RemoveRow {
    rowId: string;
    unitStockId: number;
    name: string;
    sku: string;
    measurement: string;
}

export default function RemoveMaterialModal({
    isOpen,
    materialStocks,
    onClose,
    onSuccess,
}: RemoveMaterialModalProps) {
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [rows, setRows] = useState<RemoveRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const availableMaterials = useMemo(
        () =>
            materialStocks
                .filter(x => !x.isDeleted)
                .filter(x =>
                    !rows.some(r => r.unitStockId === x.id))
                .sort((a, b) =>
                    a.unit.name.localeCompare(b.unit.name)),
        [materialStocks, rows]
    );

    if (!isOpen) return null;

    const resetForm = () => {
        setSelectedMaterialId('');
        setRows([]);
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;

        resetForm();
        onClose();
    };

    const handleAddMaterial = () => {
        const stock = availableMaterials.find(
            x => String(x.id) === selectedMaterialId
        );

        if (!stock) return;

        if (rows.some(x => x.unitStockId === stock.id)) {
            return;
        }

        setRows(prev => [
            ...prev,
            {
                rowId: crypto.randomUUID(),
                unitStockId: stock.id,
                name: stock.unit.name,
                sku: stock.unit.sku,
                measurement: stock.unit.measurement,
            },
        ]);

        setSelectedMaterialId('');
    };

    const handleRemoveRow = (rowId: string) => {
        setRows(prev =>
            prev.filter(x => x.rowId !== rowId)
        );
    };

    const handleSubmit = async () => {
        if (rows.length === 0) {
            setApiError('Select at least one material.');
            return;
        }

        const confirmed = window.confirm(
            `Remove ${rows.length} material(s)?\n\n` +
            `Materials will no longer appear in inventory, reports, or dropdown lists.\n\n` +
            `Existing products will keep their recipes.`
        );

        if (!confirmed) {
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        try {
            const response = await apiFetch(
                '/api/materials/delete',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        unitStockIds: rows.map(
                            x => x.unitStockId
                        ),
                    }),
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'You are not authorized. Please sign in again.'
                );
            }

            if (!response.ok) {
                throw new Error(
                    `Delete failed (${response.status})`
                );
            }

            resetForm();
            onSuccess();
            onClose();
        }
        catch (err: any) {
            setApiError(
                err.message ?? 'Error removing materials.'
            );
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div
                className="modal-form"
                style={{
                    ...modalStyle,
                    width: '850px',
                    maxWidth: '95vw',
                }}
            >
                <h3
                    style={{
                        margin: '0 0 16px',
                        color: '#2dd4bf',
                        textAlign: 'center',
                    }}
                >
                    Remove Materials
                </h3>

                <div
                    style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '16px',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ flex: 1 }}>
                        <Combobox
                            value={selectedMaterialId}
                            onChange={setSelectedMaterialId}
                            placeholder="Search material..."
                            options={availableMaterials.map(x => ({
                                value: String(x.id),
                                label: x.unit.name,
                                hint: `${x.unit.sku} · ${x.unit.measurement}`,
                            }))}
                        />
                    </div>

                    <button
                        type="button"
                        style={{
                            ...addBtnStyle,
                            height: '36px',
                            marginTop: 0,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onClick={handleAddMaterial}
                    >
                        + Mark For Removal
                    </button>
                </div>

                <div style={scrollAreaStyle}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                        }}
                    >
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        textAlign: 'center',
                                        padding: '10px',
                                        color: '#94a3b8',
                                    }}
                                >
                                    Material
                                </th>

                                <th
                                    style={{
                                        textAlign: 'center',
                                        padding: '10px',
                                        color: '#94a3b8',
                                    }}
                                >
                                    SKU
                                </th>

                                <th
                                    style={{
                                        textAlign: 'center',
                                        padding: '10px',
                                        color: '#94a3b8',
                                    }}
                                >
                                    Unit
                                </th>

                                <th
                                    style={{
                                        width: '50px',
                                    }}
                                />
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map(row => (
                                <tr
                                    key={row.rowId}
                                    style={{
                                        fontSize: '16px',
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: '10px',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        {row.name}
                                    </td>

                                    <td
                                        style={{
                                            padding: '10px',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        {row.sku}
                                    </td>

                                    <td
                                        style={{
                                            padding: '10px',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        {row.measurement}
                                    </td>

                                    <td
                                        style={{
                                            padding: '10px',
                                            textAlign: 'center',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveRow(row.rowId)
                                            }
                                            style={removeBtnStyle}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        style={{
                                            padding: '24px',
                                            textAlign: 'center',
                                            color: '#94a3b8',
                                        }}
                                    >
                                        No materials selected.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {apiError && (
                    <div
                        style={{
                            marginTop: '12px',
                            color: '#f87171',
                            fontSize: '13px',
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
                        style={cancelBtnStyle}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={
                            rows.length === 0 ||
                            isSubmitting
                        }
                        onClick={handleSubmit}
                        style={{
                            ...submitBtnStyle,
                            opacity:
                                rows.length === 0 ||
                                    isSubmitting
                                    ? 0.5
                                    : 1,
                        }}
                    >
                        {isSubmitting
                            ? 'Removing...'
                            : 'Remove Materials'}
                    </button>
                </div>
            </div>
        </div>
    );
}