// src/features/office/RemoveProductModal.tsx

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
import type { Product } from '../../types/inventory';

interface RemoveProductModalProps {
    isOpen: boolean;
    products: Product[];
    onClose: () => void;
    onSuccess: () => void;
}

interface RemoveRow {
    rowId: string;
    productId: number;
    name: string;
    sku: string;
    price: number;
}

export default function RemoveProductModal({
    isOpen,
    products,
    onClose,
    onSuccess,
}: RemoveProductModalProps) {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [rows, setRows] = useState<RemoveRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const availableProducts = useMemo(
        () =>
            products
                .filter(x => !x.isDeleted)
                .filter(
                    x =>
                        !rows.some(
                            r => r.productId === x.id
                        )
                )
                .sort((a, b) =>
                    a.name.localeCompare(b.name)
                ),
        [products, rows]
    );

    if (!isOpen) return null;

    const resetForm = () => {
        setSelectedProductId('');
        setRows([]);
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;

        resetForm();
        onClose();
    };

    const handleAddProduct = () => {
        const product = availableProducts.find(
            x => String(x.id) === selectedProductId
        );

        if (!product)
            return;

        setRows(prev => [
            ...prev,
            {
                rowId: crypto.randomUUID(),
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
            },
        ]);

        setSelectedProductId('');
    };

    const handleRemoveRow = (rowId: string) => {
        setRows(prev =>
            prev.filter(x => x.rowId !== rowId)
        );
    };

    const handleSubmit = async () => {
        if (rows.length === 0) {
            setApiError(
                'Select at least one product.'
            );
            return;
        }

        const confirmed = window.confirm(
            `Remove ${rows.length} product(s)?\n\n` +
            `Products will no longer appear in production screens, stock reports and dropdowns.`
        );

        if (!confirmed)
            return;

        setIsSubmitting(true);
        setApiError(null);

        try {
            const response = await apiFetch(
                '/api/product/delete',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        productIds: rows.map(
                            x => x.productId
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
                err.message ??
                'Error removing products.'
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
                    Remove Products
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
                            value={selectedProductId}
                            onChange={setSelectedProductId}
                            placeholder="Search product..."
                            options={availableProducts.map(
                                p => ({
                                    value: String(p.id),
                                    label: p.name,
                                    hint:
                                        `${p.sku} · $${p.price.toFixed(2)}`,
                                })
                            )}
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
                        onClick={handleAddProduct}
                    >
                        + Mark For Removal
                    </button>
                </div>

                <div style={scrollAreaStyle}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse:
                                'collapse',
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    fontSize: '13px',
                                }}
                            >
                                <th
                                    style={{
                                        textAlign:
                                            'center',
                                        padding:
                                            '10px',
                                        color:
                                            '#94a3b8',
                                    }}
                                >
                                    Product
                                </th>

                                <th
                                    style={{
                                        textAlign:
                                            'center',
                                        padding:
                                            '10px',
                                        color:
                                            '#94a3b8',
                                    }}
                                >
                                    SKU
                                </th>

                                <th
                                    style={{
                                        textAlign:
                                            'center',
                                        padding:
                                            '10px',
                                        color:
                                            '#94a3b8',
                                    }}
                                >
                                    Price
                                </th>

                                <th
                                    style={{
                                        width: '60px',
                                    }}
                                />
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map(row => (
                                <tr
                                    key={row.rowId}
                                    style={{
                                        fontSize:
                                            '13px',
                                    }}
                                >
                                    <td
                                        style={{
                                            padding:
                                                '10px',
                                            textAlign:
                                                'center',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        {row.name}
                                    </td>

                                    <td
                                        style={{
                                            padding:
                                                '10px',
                                            textAlign:
                                                'center',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        {row.sku}
                                    </td>

                                    <td
                                        style={{
                                            padding:
                                                '10px',
                                            textAlign:
                                                'center',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        $
                                        {row.price.toFixed(
                                            2
                                        )}
                                    </td>

                                    <td
                                        style={{
                                            padding:
                                                '10px',
                                            textAlign:
                                                'center',
                                            borderTop:
                                                '1px solid rgba(51,65,85,0.5)',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveRow(
                                                    row.rowId
                                                )
                                            }
                                            style={
                                                removeBtnStyle
                                            }
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
                                            padding:
                                                '24px',
                                            textAlign:
                                                'center',
                                            color:
                                                '#94a3b8',
                                        }}
                                    >
                                        No products selected.
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
                        justifyContent:
                            'flex-end',
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
                                rows.length ===
                                    0 ||
                                    isSubmitting
                                    ? 0.5
                                    : 1,
                        }}
                    >
                        {isSubmitting
                            ? 'Removing...'
                            : 'Remove Products'}
                    </button>
                </div>
            </div>
        </div>
    );
}