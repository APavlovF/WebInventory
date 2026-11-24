import { useInventoryStore } from '../../data/InventoryContext';
import AddProductTypeModal from '../workshop/AddProductTypeModal';
import ProduceBatchModal from '../workshop/ProduceBatchModal';
import BuyMaterialsModal from '../market/BuyMaterialsModal';
import SellProductsModal from '../market/SellProductsModal';
import MaterialLimitsModal from '../warehouse/MaterialLimitsModal';
import RemoveMaterialModal from '../office/RemoveMaterialModal';
import RemoveProductModal from '../office/RemoveProductModal';
import type { BuyRow, Product } from '../../types/inventory';

export type ActiveMapModal =
    | 'addProduct'
    | 'produceBatch'
    | 'buyMaterials'
    | 'sellProducts'
    | 'materialLimits'
    | 'removeMaterial'
    | 'removeProduct'
    | null;

interface MapModalsProps {
    activeModal: ActiveMapModal;
    autoImport: boolean;
    initialRows?: BuyRow[];
    initialProducts?: Product[];
    maxStock: number;
    onClose: () => void;
}

export default function MapModals({ activeModal, autoImport, initialRows, initialProducts, maxStock, onClose }: MapModalsProps) {
    const { products, productStocks, unitStocks, units, commissions, refresh } = useInventoryStore();

    return (
        <>
            {/* Workshop forms */}
            <AddProductTypeModal
                isOpen={activeModal === 'addProduct'}
                initialProducts={initialProducts}
                materials={units}
                materialStocks={unitStocks}
                availableCommissions={commissions}
                products={products}
                onClose={onClose}
                onSuccess={() => {
                    void refresh();
                }}
            />

            <ProduceBatchModal
                isOpen={activeModal === 'produceBatch'}
                products={products}
                productStocks={productStocks}
                materialStocks={unitStocks}
                maxStock={maxStock}
                onClose={onClose}
                onSuccess={refresh}
            />

            {/* Market / Office import forms */}
            <BuyMaterialsModal
                isOpen={activeModal === 'buyMaterials'}
                autoOpenImport={autoImport}
                initialRows={initialRows}
                units={units}
                materialStocks={unitStocks}
                maxStock={1000}
                onClose={onClose}
                onSuccess={refresh}
            />

            <SellProductsModal
                isOpen={activeModal === 'sellProducts'}
                products={products}
                productStocks={productStocks}
                onClose={onClose}
                onSuccess={refresh}
            />

            {/* Warehouse forms */}
            <MaterialLimitsModal
                key={activeModal}
                isOpen={activeModal === 'materialLimits'}
                unitStocks={unitStocks}
                onClose={onClose}
                onSuccess={refresh}
            />

            {/* Office forms */}
            <RemoveMaterialModal
                isOpen={activeModal === 'removeMaterial'}
                materialStocks={unitStocks}
                onClose={onClose}
                onSuccess={refresh}
            />

            <RemoveProductModal
                isOpen={activeModal === 'removeProduct'}
                products={products}
                onClose={onClose}
                onSuccess={refresh}
            />
        </>
    );
}