// src/features/workshop/ProduceBatchModal.tsx
import { useState, useMemo } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { Item, Product, ProductStock, UnitStock } from '../../types/inventory';

export interface ConsumedMaterial {
    unitId: number;
    consumed: number;
}

interface ProduceBatchModalProps {
    isOpen: boolean;
    products: Product[];          // Product types; each Item = a material (Unit) + quantity needed for ONE product
    productStocks: ProductStock[]; // Existing product stock records (used to sum current stock per product)
    materialStocks: UnitStock[];   // Available material stock (UnitStock.Unit + UnitStock.Quantity)
    maxStock: number;              // Max stock limit, applied per product type
    userId: number;                // Current user, saved with the batch
    onClose: () => void;
    onSuccess: (saved: ProductStock, consumedMaterials: ConsumedMaterial[]) => void;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export default function ProduceBatchModal({
    isOpen,
    products,
    productStocks,
    materialStocks,
    maxStock,
    userId,
    onClose,
    onSuccess,
}: ProduceBatchModalProps) {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [batchQuantity, setBatchQuantity] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Current stock per product id, summed from existing ProductStock records
    const stockByProductId = useMemo(() => {
        const map = new Map<number, number>();
        productStocks.forEach((ps) => {
            const id = ps.product?.id;
            if (id != null) map.set(id, (map.get(id) || 0) + ps.quantity);
        });
        return map;
    }, [productStocks]);

    // Available stock per unit id (a unit may appear in several UnitStock rows)
    const availableByUnitId = useMemo(() => {
        const map = new Map<number, number>();
        materialStocks.forEach((us) => {
            map.set(us.unit.id, (map.get(us.unit.id) || 0) + us.quantity);
        });
        return map;
    }, [materialStocks]);

    const selectedProduct = useMemo(
        () => products.find((p) => String(p.id) === selectedProductId),
        [products, selectedProductId]
    );

    const qtyNumber = Number(batchQuantity) || 0;

    const existingQty = selectedProduct ? stockByProductId.get(selectedProduct.id) || 0 : 0;
    const roomLeft = Math.max(0, maxStock - existingQty);
    const exceedsStockLimit = Boolean(selectedProduct) && qtyNumber > roomLeft;

    // Required vs available for each material of the selected product
    const requirements = useMemo(() => {
        if (!selectedProduct) return [];

        // Merge in case the same unit appears twice in the product's items
        const perUnitByUnit = new Map<number, { item: Item; perUnit: number }>();
        (selectedProduct.items ?? []).forEach((item) => {
            const prev = perUnitByUnit.get(item.unit.id);
            const perUnit = item.quantity + (prev?.perUnit || 0);
            perUnitByUnit.set(item.unit.id, { item, perUnit });
        });

        return Array.from(perUnitByUnit.values()).map(({ item, perUnit }) => {
            const available = availableByUnitId.get(item.unit.id) || 0;
            const required = round(perUnit * qtyNumber);
            return {
                unitId: item.unit.id,
                name: item.unit.name,
                measurement: item.unit.measurement,
                perUnit,
                required,
                available,
                isInsufficient: required > available,
                maxUnits: perUnit > 0 ? Math.floor(available / perUnit) : Infinity,
            };
        });
    }, [selectedProduct, availableByUnitId, qtyNumber]);

    const hasInsufficientMaterials = requirements.some((r) => r.isInsufficient);

    // A recipe line without a quantity would make the product consume nothing: block it
    const hasInvalidRecipe = requirements.some((r) => !(r.perUnit > 0));

    // Largest batch allowed right now (materials and stock limit)
    const maxProducible = Math.min(roomLeft, ...requirements.map((r) => r.maxUnits));

    const isFormValid =
        Boolean(selectedProduct) &&
        Number.isInteger(qtyNumber) &&
        qtyNumber > 0 &&
        !hasInvalidRecipe &&
        !hasInsufficientMaterials &&
        !exceedsStockLimit;

    if (!isOpen) return null;

    const resetForm = () => {
        setSelectedProductId('');
        setBatchQuantity('1');
        setApiError(null);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isFormValid || !selectedProduct || isSubmitting) return;

        setIsSubmitting(true);
        setApiError(null);

        // Matches the C# ProductStock { Product, Quantity, UserId }
        const payload = {
            product: selectedProduct,
            quantity: qtyNumber,
            userId,
        };

        try {
            // Replace with your actual endpoint
            const response = await fetch('/api/productstock/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // If the API uses JWT instead of cookies, add:
                    // Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                throw new Error('You are not authorized. Please sign in again.');
            }
            if (!response.ok) {
                throw new Error(`Production failed (${response.status})`);
            }

            const saved: ProductStock = await response.json();
            const consumed = requirements.map((r) => ({ unitId: r.unitId, consumed: r.required }));

            resetForm();
            onSuccess(saved, consumed);
            onClose();
        } catch (err: any) {
            setApiError(err.message || 'Error recording batch production.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const quantityHasProblem = hasInsufficientMaterials || exceedsStockLimit;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2dd4bf' }}>Produce Batch</h3>

                <form onSubmit={handleSubmit}>
                    {/* Product */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>Select Product</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">-- Choose Product --</option>
                            {products.map((p) => {
                                const inStock = stockByProductId.get(p.id) || 0;
                                return (
                                    <option key={p.id} value={p.id} disabled={inStock >= maxStock}>
                                        {p.name} (In stock: {inStock} / {maxStock})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Batch quantity */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Batch Quantity to Produce</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={batchQuantity}
                            onChange={(e) => setBatchQuantity(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: quantityHasProblem ? '#f87171' : 'rgba(20, 184, 166, 0.4)',
                            }}
                        />
                        {selectedProduct && !hasInvalidRecipe && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                You can produce up to{' '}
                                <strong style={{ color: '#2dd4bf' }}>{maxProducible}</strong> right now
                            </div>
                        )}
                    </div>

                    {/* Live breakdown */}
                    {selectedProduct && (
                        <div
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(20, 184, 166, 0.25)',
                                borderRadius: '6px',
                                padding: '12px',
                                marginBottom: '14px',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                                Stock limit:
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '13px',
                                    padding: '4px 0 8px',
                                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                    color: exceedsStockLimit ? '#f87171' : '#e2e8f0',
                                }}
                            >
                                <span>{selectedProduct.name}</span>
                                <span>
                                    <strong>{existingQty + qtyNumber}</strong> / Max: <strong>{maxStock}</strong>
                                </span>
                            </div>
                            {exceedsStockLimit && (
                                <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>
                                    Exceeds max stock limit
                                </div>
                            )}

                            <div style={{ fontSize: '12px', color: '#94a3b8', margin: '12px 0 8px' }}>
                                Material Requirements:
                            </div>

                            {requirements.length === 0 && (
                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    This product has no materials defined.
                                </div>
                            )}

                            {requirements.map((req) => (
                                <div
                                    key={req.unitId}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '13px',
                                        padding: '4px 0',
                                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                        color: req.isInsufficient ? '#f87171' : '#e2e8f0',
                                    }}
                                >
                                    <span>{req.name} ({req.perUnit} {req.measurement} each)</span>
                                    <span>
                                        Need: <strong>{req.required}</strong> / Avail:{' '}
                                        <strong>{req.available}</strong> {req.measurement}
                                    </span>
                                </div>
                            ))}

                            {hasInvalidRecipe && (
                                <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '13px', marginTop: '10px' }}>
                                    Some materials of this product have no quantity defined
                                </div>
                            )}

                            {hasInsufficientMaterials && (
                                <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '13px', marginTop: '10px' }}>
                                    Not enough materials
                                </div>
                            )}
                        </div>
                    )}

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
                            {isSubmitting ? 'Producing...' : 'Produce Batch'}
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
