import { useInventoryStore } from '../../data/InventoryContext';
import AddProductTypeModal from '../workshop/AddProductTypeModal';
import ProduceBatchModal from '../workshop/ProduceBatchModal';
import BuyMaterialsModal from '../market/BuyMaterialsModal';
import SellProductsModal from '../market/SellProductsModal';
import MaterialLimitsModal from '../warehouse/MaterialLimitsModal';
import ProductionMapModal from '../warehouse/ProductionMapModal';
import RemoveMaterialModal from '../office/RemoveMaterialModal';
import RemoveProductModal from '../office/RemoveProductModal';

export type ActiveMapModal =
    | 'addProduct'
    | 'produceBatch'
    | 'buyMaterials'
    | 'sellProducts'
    | 'materialLimits'
    | 'productionMap'
    | 'removeMaterial'
    | 'removeProduct'
    | null;

interface MapModalsProps {
    activeModal: ActiveMapModal;
    autoImport: boolean;
    maxStock: number;
    onClose: () => void;
}

export default function MapModals({ activeModal, autoImport, maxStock, onClose }: MapModalsProps) {
    const { products, productStocks, unitStocks, units, commissions, refresh } = useInventoryStore();

    return (
        <>
            {/* Workshop forms */}
            <AddProductTypeModal
                isOpen={activeModal === 'addProduct'}
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

            <ProductionMapModal
                isOpen={activeModal === 'productionMap'}
                products={products}
                onClose={onClose}
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