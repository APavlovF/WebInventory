// src/features/workshop/AddProductTypeModal.tsx
import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { apiFetch } from '../../api';
import type { Product, Unit } from '../../types/inventory';

interface AddProductTypeModalProps {
    isOpen: boolean;
    materials: Unit[]; // Cached units ("materials") from DB
    onClose: () => void;
    onSuccess: (newProduct: Product) => void;
}

interface MaterialRow {
    rowId: string;
    unitId: string;   // '' = nothing selected yet
    quantity: string; // amount of this material needed for ONE product
}

const newRow = (): MaterialRow => ({ rowId: crypto.randomUUID(), unitId: '', quantity: '' });

export default function AddProductTypeModal({
    isOpen,
    materials,
    onClose,
    onSuccess,
}: AddProductTypeModalProps) {
    const [productName, setProductName] = useState('');
    const [sku, setSku] = useState('');
    const [rows, setRows] = useState<MaterialRow[]>([newRow()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setProductName('');
        setSku('');
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

    const handleRowChange = (rowId: string, field: 'unitId' | 'quantity', value: string) =>
        setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

    // A material can only be used once per product: hide it in other rows' dropdowns
    const isTakenByOtherRow = (rowId: string, unitId: number) =>
        rows.some((r) => r.rowId !== rowId && r.unitId === String(unitId));

    const isFormValid =
        productName.trim().length > 0 &&
        sku.trim().length > 0 &&
        rows.every((r) => r.unitId !== '' && Number(r.quantity) > 0);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# Product { Name, Sku, Items: [ Item { Quantity, Unit } ] }
        // Item.Quantity = how much of the material ONE product needs. No stock is touched here.
        const payload = {
            name: productName.trim(),
            sku: sku.trim(),
            items: rows.map((r) => {
                const unit = materials.find((m) => String(m.id) === r.unitId)!;
                return { quantity: Number(r.quantity), unit };
            }),
        };

        try {
            const response = await apiFetch('/api/product/add', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Failed to save product (${response.status})`);
            }

            const savedProduct: Product = await response.json();

            resetForm();
            onSuccess(savedProduct);
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error saving product to database.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf' }}>Add Product Type</h3>

                <form onSubmit={handleSubmit}>
                    {/* Product Name */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Product Name</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g., Wooden Chair"
                            maxLength={1000}
                            style={inputStyle}
                            required
                        />
                    </div>

                    {/* SKU */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>SKU</label>
                        <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="e.g., CHAIR-OAK-001"
                            maxLength={200}
                            style={inputStyle}
                            required
                        />
                    </div>

                    {/* Materials that compose the product */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Materials (quantity per 1 product)</label>

                        {rows.map((row) => (
                            <div
                                key={row.rowId}
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}
                            >
                                <select
                                    value={row.unitId}
                                    onChange={(e) => handleRowChange(row.rowId, 'unitId', e.target.value)}
                                    style={{ ...inputStyle, flex: 2 }}
                                >
                                    <option value="">-- Select Material --</option>
                                    {materials.map((m) => (
                                        <option
                                            key={m.id}
                                            value={m.id}
                                            disabled={isTakenByOtherRow(row.rowId, m.id)}
                                        >
                                            {m.name}
                                            {m.measurement ? ` (${m.measurement})` : ''}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={row.quantity}
                                    onChange={(e) => handleRowChange(row.rowId, 'quantity', e.target.value)}
                                    placeholder="Qty"
                                    style={{ ...inputStyle, flex: 1 }}
                                />

                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(row.rowId)}
                                        style={removeBtnStyle}
                                        title="Remove material"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddRow}
                            disabled={rows.length >= materials.length}
                            style={{
                                ...addBtnStyle,
                                opacity: rows.length >= materials.length ? 0.5 : 1,
                                cursor: rows.length >= materials.length ? 'not-allowed' : 'pointer',
                            }}
                        >
                            + Add Material
                        </button>
                    </div>

                    {apiError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                            {apiError}
                        </div>
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
                            {isSubmitting ? 'Saving...' : 'Save Product Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    fontFamily: 'monospace',
};

const modalStyle: CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(20, 184, 166, 0.5)',
    borderRadius: '8px',
    padding: '24px',
    width: '440px',
    maxWidth: '95vw',
    color: '#f8fafc',
    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
};

const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
};

const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: '#1e293b',
    border: '1px solid rgba(20, 184, 166, 0.4)',
    borderRadius: '4px',
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
};

const addBtnStyle: CSSProperties = {
    background: 'rgba(20, 184, 166, 0.1)',
    color: '#2dd4bf',
    border: '1px dashed rgba(20, 184, 166, 0.6)',
    borderRadius: '4px',
    padding: '6px 12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    marginTop: '4px',
};

const removeBtnStyle: CSSProperties = {
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    borderRadius: '4px',
    padding: '8px 10px',
    cursor: 'pointer',
};

const cancelBtnStyle: CSSProperties = {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    cursor: 'pointer',
};

const submitBtnStyle: CSSProperties = {
    background: '#14b8a6',
    color: '#0f172a',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
};
