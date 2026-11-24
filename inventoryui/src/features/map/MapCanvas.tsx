import { useState, useEffect, useMemo } from 'react';
import BuildingNode from './BuildingNode';
import MapVehicles from './MapVehicles';
import MapTerrainLayer from './MapTerrainLayer';
import MapModals, { type ActiveMapModal } from './MapModals';
import {
    LANDMARK_GRID,
    TRUCK_WAYPOINTS,
    CAR_WAYPOINTS,
    projectCoordinate,
    buildTerrainRoute,
    type MapDimensions,
} from './mapGeometry';
import { useInventoryStore } from '../../data/InventoryContext';
import { c } from '../../theme/themes';
import WarehouseSemaphore from '../warehouse/WarehouseSemaphore';
import AiParserModal, { type AiImportType } from './AiParserModal';

const MAX_STOCK = 10000;

interface MapCanvasProps {
    onBuildingClick: (name: string) => void;
}

export default function MapCanvas({ onBuildingClick }: MapCanvasProps) {
    const [dimensions, setDimensions] = useState<MapDimensions>({ width: 1200, height: 800 });
    const [autoImport, setAutoImport] = useState(false);
    const [activeModal, setActiveModal] = useState<ActiveMapModal>(null);
    const { productStocks, unitStocks, products } = useInventoryStore();
    const [showAiParserModal, setShowAiParserModal] = useState(false);

    const handleAiImportAction = (type: AiImportType) => {
        setShowAiParserModal(false);
        setAutoImport(true);
        if (type === 'invoice' || type === 'materials') {
            setActiveModal('buyMaterials');
        } else if (type === 'products') {
            setActiveModal('addProduct');
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('map-container');
            if (container) {
                setDimensions({
                    width: container.clientWidth || window.innerWidth - 240,
                    height: container.clientHeight || window.innerHeight - 150,
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { landmarks, truckRoutePoints, carCircuitPoints } = useMemo(
        () => ({
            landmarks: {
                warehouse: projectCoordinate(LANDMARK_GRID.warehouse.x, LANDMARK_GRID.warehouse.y, dimensions),
                office: projectCoordinate(LANDMARK_GRID.office.x, LANDMARK_GRID.office.y, dimensions),
                workshop: projectCoordinate(LANDMARK_GRID.workshop.x, LANDMARK_GRID.workshop.y, dimensions),
                market: projectCoordinate(LANDMARK_GRID.market.x, LANDMARK_GRID.market.y, dimensions),
            },
            truckRoutePoints: buildTerrainRoute(TRUCK_WAYPOINTS, dimensions),
            carCircuitPoints: buildTerrainRoute(CAR_WAYPOINTS, dimensions),
        }),
        [dimensions]
    );

    return (
        <div
            id="map-container"
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                backgroundColor: c.bgMap,
                overflow: 'hidden',
            }}
        >
            <MapTerrainLayer
                dimensions={dimensions}
                truckRoutePoints={truckRoutePoints}
                carCircuitPoints={carCircuitPoints}
            />

            <MapVehicles
                truckRoutePoints={truckRoutePoints}
                carCircuitPoints={carCircuitPoints}
            />

            <BuildingNode
                name="Warehouse"
                top={`${landmarks.warehouse.y - 75}px`}
                left={`${landmarks.warehouse.x - 65}px`}
                imgSrc="map-warehouse.png"
                onClick={() => onBuildingClick('Warehouse')}
                onSetupStockLimits={() => setActiveModal('materialLimits')}
            />
            <WarehouseSemaphore
                top={`${landmarks.warehouse.y - 120}px`}
                left={`${landmarks.warehouse.x + 65}px`}
                unitStocks={unitStocks}
                productStocks={productStocks}
                products={products}
            />
            <BuildingNode
                name="Office"
                top={`${landmarks.office.y - 75}px`}
                left={`${landmarks.office.x - 65}px`}
                imgSrc="map-office.png"
                //onClick={() => setShowAiParserModal(true)}
                onImportInvoice={() => {
                    setAutoImport(true);
                    setActiveModal('buyMaterials');
                }}
                onRemoveMaterial={() => setActiveModal('removeMaterial')}
                onRemoveProduct={() => setActiveModal('removeProduct')}
            />
            <BuildingNode
                name="Workshop"
                top={`${landmarks.workshop.y - 75}px`}
                left={`${landmarks.workshop.x - 65}px`}
                imgSrc="map-workshop.png"
                onClick={() => onBuildingClick('Workshop')}
                onNewProduct={() => setActiveModal('addProduct')}
                onCreateProducts={() => setActiveModal('produceBatch')}
            />
            <BuildingNode
                name="Market"
                top={`${landmarks.market.y - 75}px`}
                left={`${landmarks.market.x - 65}px`}
                imgSrc="map-market.png"
                onClick={() => onBuildingClick('Market')}
                onBuyMaterials={() => {
                    setAutoImport(false);
                    setActiveModal('buyMaterials');
                }}
                onSellProducts={() => setActiveModal('sellProducts')}
            />

            <MapModals
                activeModal={activeModal}
                autoImport={autoImport}
                maxStock={MAX_STOCK}
                onClose={() => setActiveModal(null)}
            />

            <AiParserModal
                isOpen={showAiParserModal}
                onClose={() => setShowAiParserModal(false)}
                onSelectAction={handleAiImportAction}
            />
        </div>
    );
}